import { supabase } from './supabase';
import {
  extractReceiptData,
  ScannedReceiptData,
  ScanProgressCallback,
} from './receiptOCR';
import { normalizeExpenseCategory } from './expenseCategories';
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

  // Downscale large photos to keep Edge Function payloads small
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
  const date = String(raw.date || '').trim();
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
    throw new Error(json?.error || `recognize-receipt failed (${res.status})`);
  }
  return json.data as OpenAiReceiptJson;
}

/**
 * AI OCR via Supabase Edge Function `recognize-receipt` only.
 * Server secret: OPENAI_API_KEY (Supabase Edge Function secrets — never VITE_).
 * Falls back to on-device Tesseract if the Edge Function is unavailable.
 */
export async function recognizeReceiptSmart(
  file: File,
  onProgress?: ScanProgressCallback,
): Promise<ScannedReceiptData> {
  onProgress?.(8, 'Preparing image…');

  try {
    const { dataUrl, mimeType } = await fileToImageDataUrl(file);
    onProgress?.(25, 'AI recognition…');

    const raw = await callEdgeFunction(dataUrl, mimeType);
    onProgress?.(100, 'Done');
    return mapOpenAiToScanned(raw);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[recognizeReceiptSmart] Edge Function failed, using Tesseract:', err);
    }
    onProgress?.(12, 'Fallback OCR…');
    const data = await extractReceiptData(file, onProgress);
    return {
      ...data,
      category: data.category || 'other',
    };
  }
}

/** True when the client can call the Edge Function (needs VITE_SUPABASE_* at build time). */
export function hasOpenAiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
