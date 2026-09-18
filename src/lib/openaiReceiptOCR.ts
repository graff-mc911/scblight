import { supabase } from './supabase';
import {
  extractReceiptData,
  ScannedReceiptData,
  ScanProgressCallback,
} from './receiptOCR';
import { normalizeExpenseCategory } from './expenseCategories';
import { normalizeReceiptDate } from './receiptDateParse';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export type OpenAiReceiptJson = {
  date?: string;
  total_amount?: number | string;
  currency?: string;
  merchant?: string;
  category?: string;
};

/** Soft warning shown in review UI (e.g. Edge 503 missing OPENAI_API_KEY). */
export type RecognizeReceiptWarning = {
  code: 'openai_not_configured' | 'edge_unavailable' | 'weak_ai_result';
  message: string;
};

export type RecognizeReceiptResult = ScannedReceiptData & {
  warning?: RecognizeReceiptWarning;
};

async function fileToImageDataUrl(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return { dataUrl, mimeType: 'image/jpeg' };
  }

  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const mimeType = 'image/jpeg';
  return { dataUrl: canvas.toDataURL(mimeType, 0.85), mimeType };
}

function mapOpenAiToScanned(raw: OpenAiReceiptJson): ScannedReceiptData {
  const totalNum = Number(raw.total_amount);
  const total = Number.isFinite(totalNum) && totalNum > 0 ? totalNum.toFixed(2) : '';
  const merchant = String(raw.merchant || '').trim();
  const date = normalizeReceiptDate(String(raw.date || '').trim());
  const currency = String(raw.currency || 'EUR').trim().toUpperCase() || 'EUR';
  const category = normalizeExpenseCategory(raw.category);

  const detectedFields = new Set<string>();
  if (merchant) detectedFields.add('store_name');
  if (total) detectedFields.add('total');
  if (date) detectedFields.add('date');
  if (category) detectedFields.add('category');

  let confidence = 40;
  if (merchant) confidence += 20;
  if (total) confidence += 25;
  if (date) confidence += 10;
  if (category && category !== 'other') confidence += 5;
  // Avoid looking "confident" when core fields are empty (date input may also reject bad formats)
  if (!merchant && !total) confidence = Math.min(confidence, 30);

  return {
    store_name: merchant,
    date: date || new Date().toISOString().split('T')[0],
    total,
    amount_net: total,
    vat_amount: '0.00',
    vat_rate: '0',
    vat_enabled: false,
    payment_method: 'Bar',
    receipt_number: '',
    items: '',
    currency,
    category,
    confidence: Math.min(99, confidence),
    detectedFields,
  };
}

function isWeakScan(data: ScannedReceiptData): boolean {
  return !data.store_name?.trim() && !data.total?.trim();
}

function mergePreferFilled(
  primary: ScannedReceiptData,
  fallback: ScannedReceiptData,
): ScannedReceiptData {
  const store_name = primary.store_name?.trim() || fallback.store_name;
  const total = primary.total?.trim() || fallback.total;
  const date =
    (primary.detectedFields.has('date') && primary.date) ||
    (fallback.detectedFields.has('date') && fallback.date) ||
    primary.date ||
    fallback.date;
  const receipt_number = primary.receipt_number?.trim() || fallback.receipt_number;
  const items = primary.items?.trim() || fallback.items;
  const currency = primary.currency || fallback.currency;
  const category =
    primary.category && primary.category !== 'other'
      ? primary.category
      : fallback.category || primary.category || 'other';

  const detectedFields = new Set<string>([
    ...Array.from(primary.detectedFields),
    ...Array.from(fallback.detectedFields),
  ]);
  if (store_name) detectedFields.add('store_name');
  if (total) detectedFields.add('total');
  if (date) detectedFields.add('date');

  const confidence = Math.max(primary.confidence, fallback.confidence);

  return {
    ...fallback,
    ...primary,
    store_name,
    total,
    amount_net: primary.amount_net?.trim() || fallback.amount_net || total,
    date: date || new Date().toISOString().split('T')[0],
    receipt_number,
    items,
    currency,
    category,
    confidence,
    detectedFields,
    vat_enabled: primary.vat_enabled || fallback.vat_enabled,
    vat_amount: primary.vat_enabled ? primary.vat_amount : fallback.vat_amount,
    vat_rate: primary.vat_enabled ? primary.vat_rate : fallback.vat_rate,
    payment_method: primary.detectedFields.has('payment_method')
      ? primary.payment_method
      : fallback.payment_method || primary.payment_method,
  };
}

class EdgeRecognizeError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'EdgeRecognizeError';
    this.status = status;
  }
}

async function callEdgeFunction(imageBase64: string, mimeType: string): Promise<OpenAiReceiptJson> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('not_authenticated');

  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) throw new Error('missing_supabase_url');

  const res = await fetch(`${base}/functions/v1/recognize-receipt`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({ imageBase64, mimeType }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.data) {
    throw new EdgeRecognizeError(
      json?.error || `recognize-receipt failed (${res.status})`,
      res.status,
    );
  }
  return json.data as OpenAiReceiptJson;
}

function warningFromEdgeError(err: unknown): RecognizeReceiptWarning | undefined {
  if (err instanceof EdgeRecognizeError) {
    const msg = err.message || '';
    if (
      err.status === 503 ||
      /OPENAI_API_KEY\s+not\s+configured/i.test(msg)
    ) {
      return {
        code: 'openai_not_configured',
        message:
          'AI recognition unavailable: OPENAI_API_KEY is not configured on the server. Using on-device OCR instead.',
      };
    }
    return {
      code: 'edge_unavailable',
      message: `AI recognition unavailable (${err.status}): ${msg}. Using on-device OCR instead.`,
    };
  }
  if (err instanceof Error && err.message === 'not_authenticated') {
    return {
      code: 'edge_unavailable',
      message: 'Sign in required for AI recognition. Using on-device OCR instead.',
    };
  }
  return {
    code: 'edge_unavailable',
    message: 'AI recognition unavailable. Using on-device OCR instead.',
  };
}

/**
 * Prefer Supabase Edge Function `recognize-receipt` (server OPENAI_API_KEY).
 * Falls back to on-device Tesseract; surfaces a clear warning when Edge returns 503.
 * Merges Tesseract fields when AI returns empty merchant+amount.
 */
export async function recognizeReceiptSmart(
  file: File,
  onProgress?: ScanProgressCallback,
): Promise<RecognizeReceiptResult> {
  onProgress?.(8, 'Preparing image…');

  let warning: RecognizeReceiptWarning | undefined;

  try {
    const { dataUrl, mimeType } = await fileToImageDataUrl(file);
    onProgress?.(25, 'AI recognition…');

    const raw = await callEdgeFunction(dataUrl, mimeType);
    const ai = mapOpenAiToScanned(raw);

    if (!isWeakScan(ai)) {
      onProgress?.(100, 'Done');
      return ai;
    }

    // AI returned empty merchant/amount — enrich with Tesseract
    onProgress?.(40, 'Improving with on-device OCR…');
    const tess = await extractReceiptData(file, onProgress);
    const merged = mergePreferFilled(ai, {
      ...tess,
      category: tess.category || ai.category || 'other',
    });
    warning = {
      code: 'weak_ai_result',
      message: 'AI returned incomplete fields; filled missing values from on-device OCR.',
    };
    onProgress?.(100, 'Done');
    return { ...merged, warning };
  } catch (err) {
    warning = warningFromEdgeError(err);
    if (import.meta.env.DEV) {
      console.warn('[recognizeReceiptSmart] Edge Function failed, using Tesseract:', err);
    }
    onProgress?.(12, 'Fallback OCR…');
    const data = await extractReceiptData(file, onProgress);
    return {
      ...data,
      category: data.category || 'other',
      warning,
    };
  }
}

/** True when the client can call the Edge Function (needs VITE_SUPABASE_* at build time). */
export function hasOpenAiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
