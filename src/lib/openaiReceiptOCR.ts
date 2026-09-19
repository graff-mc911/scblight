import { supabase } from './supabase';
import {
  extractReceiptData,
  ScannedReceiptData,
  ScanProgressCallback,
} from './receiptOCR';
import {
  confidenceFromFields,
  normalizeReceiptFields,
} from './receiptFieldNormalize';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

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

function mapOpenAiToScanned(raw: unknown): ScannedReceiptData {
  const f = normalizeReceiptFields(raw);
  const detectedFields = new Set<string>();
  if (f.merchant) detectedFields.add('store_name');
  if (f.total) detectedFields.add('total');
  if (f.date) detectedFields.add('date');
  if (f.category) detectedFields.add('category');
  if (f.payment_explicit) detectedFields.add('payment_method');
  if (f.receipt_number) detectedFields.add('receipt_number');
  if (f.items) detectedFields.add('items');

  const confidence = confidenceFromFields({
    merchant: f.merchant,
    total: f.total,
    date: f.date,
    category: f.category,
    payment_explicit: f.payment_explicit,
    items: f.items,
  });

  return {
    store_name: f.merchant,
    date: f.date || new Date().toISOString().split('T')[0],
    total: f.total,
    amount_net: f.total,
    vat_amount: '0.00',
    vat_rate: '0',
    vat_enabled: false,
    payment_method: f.payment_method || 'Bar',
    receipt_number: f.receipt_number,
    items: f.items,
    currency: f.currency,
    category: f.category,
    confidence,
    detectedFields,
  };
}

function missingCoreFields(data: ScannedReceiptData): boolean {
  return (
    !data.store_name?.trim() ||
    !data.total?.trim() ||
    !data.detectedFields.has('payment_method') ||
    !data.detectedFields.has('date')
  );
}

function isWeakScan(data: ScannedReceiptData): boolean {
  return !data.store_name?.trim() || !data.total?.trim();
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

  const payment_method = primary.detectedFields.has('payment_method')
    ? primary.payment_method
    : fallback.detectedFields.has('payment_method')
      ? fallback.payment_method
      : primary.payment_method || fallback.payment_method || 'Bar';

  const detectedFields = new Set<string>([
    ...Array.from(primary.detectedFields),
    ...Array.from(fallback.detectedFields),
  ]);
  if (store_name) detectedFields.add('store_name');
  if (total) detectedFields.add('total');
  if (date) detectedFields.add('date');
  if (
    (primary.detectedFields.has('payment_method') ||
      fallback.detectedFields.has('payment_method')) &&
    payment_method
  ) {
    detectedFields.add('payment_method');
  }

  const confidence = confidenceFromFields({
    merchant: store_name,
    total,
    date,
    category,
    payment_explicit: detectedFields.has('payment_method'),
    items,
  });

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
    payment_method,
    confidence,
    detectedFields,
    vat_enabled: primary.vat_enabled || fallback.vat_enabled,
    vat_amount: primary.vat_enabled ? primary.vat_amount : fallback.vat_amount,
    vat_rate: primary.vat_enabled ? primary.vat_rate : fallback.vat_rate,
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

async function callEdgeFunction(imageBase64: string, mimeType: string): Promise<unknown> {
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
  return json.data;
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
 * Merges Tesseract when AI is missing merchant, amount, date, or payment.
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

    if (!missingCoreFields(ai)) {
      onProgress?.(100, 'Done');
      return ai;
    }

    // AI incomplete — enrich gaps (merchant/total/date/payment) with Tesseract
    onProgress?.(40, 'Improving with on-device OCR…');
    const tess = await extractReceiptData(file, onProgress);
    const merged = mergePreferFilled(ai, {
      ...tess,
      category: tess.category || ai.category || 'other',
    });
    if (isWeakScan(merged) || isWeakScan(ai)) {
      warning = {
        code: 'weak_ai_result',
        message: 'AI returned incomplete fields; filled missing values from on-device OCR.',
      };
    }
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
