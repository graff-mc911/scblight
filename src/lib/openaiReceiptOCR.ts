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
  const res = await fetch(`${base}/functions/v1/recognize-receipt`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({ imageBase64, mimeType }),
  });

  const json = await res.json();
  if (!res.ok || !json?.data) {
    throw new Error(json?.error || `recognize-receipt failed (${res.status})`);
  }
  return json.data as OpenAiReceiptJson;
}

async function callOpenAiDirect(imageBase64: string): Promise<OpenAiReceiptJson> {
  const key = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!key) throw new Error('no_client_openai_key');

  const system = `You are a receipt data extractor for personal bookkeeping.
Look at the receipt image and return ONLY a single JSON object.
No markdown, no code fences, no commentary.

Schema (exact keys):
{
  "date": "YYYY-MM-DD or empty string if unknown",
  "total_amount": number (gross total paid, use 0 if unknown),
  "currency": "ISO 4217 code like EUR, USD, UAH (default EUR if unclear)",
  "merchant": "store or vendor name, empty string if unknown",
  "category": "one of: food, auto, entertainment, materials, utilities, health, travel, office, other"
}

Rules:
- Prefer the final amount due / total / Summe / Gesamt / Zu zahlen.
- Do not invent merchants or amounts; use empty string or 0 when unsure.
- category must be exactly one of the allowed values.
- Output must be valid JSON parseable by JSON.parse.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract receipt fields as JSON per system instructions.' },
            { type: 'image_url', image_url: { url: imageBase64, detail: 'high' } },
          ],
        },
      ],
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || 'OpenAI direct call failed');
  }
  const content = json?.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content) as OpenAiReceiptJson;
}

/**
 * Prefer OpenAI gpt-4o-mini (Edge Function → optional VITE_OPENAI_API_KEY),
 * fall back to on-device Tesseract.
 */
export async function recognizeReceiptSmart(
  file: File,
  onProgress?: ScanProgressCallback,
): Promise<ScannedReceiptData> {
  onProgress?.(8, 'Preparing image…');

  try {
    const { dataUrl, mimeType } = await fileToImageDataUrl(file);
    onProgress?.(25, 'AI recognition…');

    try {
      const raw = await callEdgeFunction(dataUrl, mimeType);
      onProgress?.(100, 'Done');
      return mapOpenAiToScanned(raw);
    } catch (edgeErr) {
      // Edge not deployed / no secret → try personal client key
      if (import.meta.env.VITE_OPENAI_API_KEY) {
        onProgress?.(40, 'AI recognition (direct)…');
        const raw = await callOpenAiDirect(dataUrl);
        onProgress?.(100, 'Done');
        return mapOpenAiToScanned(raw);
      }
      throw edgeErr;
    }
  } catch {
    onProgress?.(12, 'Fallback OCR…');
    const data = await extractReceiptData(file, onProgress);
    return {
      ...data,
      category: data.category || 'other',
    };
  }
}

export function hasOpenAiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_OPENAI_API_KEY);
}
