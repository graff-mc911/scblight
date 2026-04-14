import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export interface ScannedReceiptData {
  store_name: string;
  date: string;
  total: string;
  amount_net: string;
  vat_amount: string;
  vat_rate: string;
  vat_enabled: boolean;
  payment_method: string;
  receipt_number: string;
  items: string;
  currency: string;
  confidence: number;
  detectedFields: Set<string>;
}

export type ScanProgressCallback = (progress: number, status: string) => void;

// Known stores to stabilise OCR naming
const KNOWN_STORES: [RegExp, string][] = [
  [/\bBAUHAUS\b/i, 'BAUHAUS'],
  [/\bREWE\b/i, 'REWE'],
  [/\bEDEKA\b/i, 'EDEKA'],
  [/\bLIDL\b/i, 'LIDL'],
  [/\bALDI\b/i, 'ALDI'],
  [/\bPENNY\b/i, 'PENNY'],
  [/\bNETTO\b/i, 'NETTO'],
  [/\bKAUFLAND\b/i, 'Kaufland'],
  [/\bOBI\b/i, 'OBI'],
  [/\bIKEA\b/i, 'IKEA'],
  [/\bMETRO\b/i, 'METRO'],
  [/\bARAL\b/i, 'ARAL'],
  [/\bSHELL\b/i, 'Shell'],
  [/\bESSO\b/i, 'ESSO'],
  [/\bJET\b/i, 'JET'],
  [/\bHORNBRACH?\b/i, 'Hornbach'],
  [/\bTOOM\b/i, 'Toom'],
  [/\bDM\b/i, 'dm'],
  [/\bROSSMANN\b/i, 'Rossmann'],
  [/\bMCDONALD'?S\b/i, "McDonald's"],
  [/\bBURGER\s+KING\b/i, 'Burger King'],
  [/\bSTARBUCKS\b/i, 'Starbucks'],
  [/\bMEDIA\s*MARKT\b/i, 'MediaMarkt'],
  [/\bSATURN\b/i, 'Saturn'],
  [/\bAMAZON\b/i, 'Amazon'],
];

// Utility helpers
function normalizeAmount(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim().replace(/\s/g, '');
  const negative = trimmed.startsWith('-');
  const abs = negative ? trimmed.slice(1) : trimmed;

  let val: string;
  if (abs.includes(',') && abs.includes('.')) {
    val = abs.lastIndexOf(',') > abs.lastIndexOf('.') ? abs.replace(/\./g, '').replace(',', '.') : abs.replace(/,/g, '');
  } else if (abs.includes(',')) {
    const parts = abs.split(',');
    val = parts[parts.length - 1].length <= 2 ? abs.replace(',', '.') : abs.replace(/,/g, '');
  } else {
    val = abs;
  }
  return negative ? `-${val}` : val;
}

const toNum = (s: string) => {
  const n = parseFloat(normalizeAmount(s));
  return isNaN(n) ? 0 : n;
};

// Image pre-processing for better OCR
async function preprocessImage(file: File, onProgress?: ScanProgressCallback): Promise<Blob> {
  onProgress?.(7, 'Bild wird optimiert...');
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const maxDim = Math.max(img.width, img.height);
        const scale = Math.min(4, maxDim < 2400 ? 2400 / maxDim : 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = data.data;
        for (let i = 0; i < d.length; i += 4) {
          const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          const bin = g > 140 ? 255 : 0;
          d[i] = bin;
          d[i + 1] = bin;
          d[i + 2] = bin;
          d[i + 3] = 255;
        }
        ctx.putImageData(data, 0, 0);
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}

// Extract text from a PDF (first 4 pages, line-preserving)
async function extractTextFromPDF(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const lines: string[] = [];

  for (let p = 1; p <= Math.min(pdf.numPages, 4); p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const byY = new Map<number, { x: number; text: string }[]>();
    for (const item of content.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 2) * 2;
      if (!byY.has(y)) byY.set(y, []);
      byY.get(y)!.push({ x: item.transform[4], text: item.str });
    }
    const ys = [...byY.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      lines.push(byY.get(y)!.sort((a, b) => a.x - b.x).map((t) => t.text).join('  '));
    }
    lines.push('');
  }
  return lines.join('\n');
}

// Render first PDF page to an image (for scanned PDFs without text)
async function renderPdfFirstPageToImage(file: File, scale = 2.5): Promise<File> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport }).promise;

  return await new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('PDF render failed'));
      resolve(new File([blob], `${file.name.replace(/\\.pdf$/i, '')}-page1.png`, { type: 'image/png' }));
    }, 'image/png');
  });
}

// OCR for images
async function extractTextFromImage(file: File, onProgress?: ScanProgressCallback): Promise<string> {
  onProgress?.(5, 'Bild wird vorbereitet...');
  let src: Blob = file;
  try {
    src = await preprocessImage(file, onProgress);
  } catch {
    /* ignore and use original */
  }

  onProgress?.(13, 'OCR-Engine wird geladen...');
  const worker = await createWorker('deu+eng', 1, {
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        onProgress?.(15 + Math.round(m.progress * 62), 'Zeichen werden erkannt...');
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: '4' as any,
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß.,:-€/*#+%@&()[]{}!\'"/ ',
    } as any);
    const { data } = await worker.recognize(src);
    onProgress?.(80, 'Daten werden analysiert...');
    return data.text;
  } finally {
    await worker.terminate();
  }
}

// Clean common OCR mistakes
function fixOCRErrors(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/O(?=\d)/g, '0')
    .replace(/(?<=\d)[oO]/g, '0')
    .replace(/(?<=\d)[lI|]/g, '1')
    .replace(/(?<=\d)S(?=\d)/g, '5')
    .replace(/(?<=\d)B(?=\d)/g, '8')
    .replace(/(?<=\d)G(?=\d)/g, '6')
    .replace(/\s{3,}/g, '  ')
    .trim();
}

// Parse helpers
function parseDate(text: string): string {
  const m = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (!m) return '';
  const d = m[1].padStart(2, '0');
  const mo = m[2].padStart(2, '0');
  const y = m[3].length === 2 ? `20${m[3]}` : m[3].padStart(4, '20');
  return `${y}-${mo}-${d}`;
}

function parseTotal(text: string): string {
  const numberRx = /(-?\d{1,6}(?:[.,]\d{2})?)(?:\s*(?:€|EUR))?/g;
  const lines = text.split('\n');
  let best = '';
  let bestScore = -1;

  const scoreLine = (line: string) => {
    let score = 0;
    if (/gesamt|summe|total|betrag|brutto|zahlbetrag/i.test(line)) score += 3;
    if (/eur|€/.test(line)) score += 1;
    if (line.length < 50) score += 1;
    return score;
  };

  for (const line of lines) {
    let match: RegExpExecArray | null;
    while ((match = numberRx.exec(line)) !== null) {
      const score = scoreLine(line);
      if (score > bestScore) {
        bestScore = score;
        best = match[1];
      }
    }
  }

  if (!best) {
    const nums = [...text.matchAll(numberRx)].map((m) => toNum(m[1])).filter((n) => n > 0);
    if (nums.length) best = nums.sort((a, b) => b - a)[0].toFixed(2);
  }
  return normalizeAmount(best);
}

function parseStoreName(text: string): string {
  for (const [rx, name] of KNOWN_STORES) {
    if (rx.test(text)) return name;
  }
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const skip = /^[\d\s€.,\-*\/+%:=|#@_]{3,}$/;
  for (const line of lines.slice(0, 30)) {
    if (line.length >= 3 && line.length <= 80 && !skip.test(line) && /[A-Za-zÄÖÜäöüß]{2}/.test(line)) {
      return line.replace(/\s{2,}/g, ' ');
    }
  }
  return '';
}

function parseVAT(text: string, total: string) {
  const totalNum = toNum(total);
  const vatRx = /(MwSt\.?|MWST|USt\.?|VAT)\s*[:=]?\s*(\d{1,2}[.,]?\d*)\s*%\s*[:=]?\s*([0-9.,]+)/gi;
  const entries: { rate: number; amount: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = vatRx.exec(text)) !== null) {
    entries.push({ rate: parseFloat(m[2].replace(',', '.')), amount: toNum(m[3]) });
  }
  if (!entries.length) return { net: '', vat: '0.00', rate: '19', enabled: false };

  const vat = entries.reduce((s, e) => s + e.amount, 0);
  const net = totalNum > 0 ? (totalNum - vat).toFixed(2) : '';
  const dominant = entries.reduce((a, b) => (b.amount > a.amount ? b : a));
  return { net, vat: vat.toFixed(2), rate: String(dominant.rate || 19), enabled: true };
}

function parsePaymentMethod(text: string): { method: string; explicit: boolean } {
  const rules: [RegExp, string][] = [
    [/\bApple\s*Pay\b/i, 'Apple Pay'],
    [/\bGoogle\s*Pay\b/i, 'Google Pay'],
    [/\bSamsung\s*Pay\b/i, 'Samsung Pay'],
    [/\bAmerican\s*Express\b|\bAMEX\b/i, 'American Express'],
    [/\bMastercard\b/i, 'Mastercard'],
    [/\bVisa\b/i, 'Visa'],
    [/\bPayPal\b/i, 'PayPal'],
    [/\bTWINT\b/i, 'TWINT'],
    [/(?:EC|Girocard|Maestro|Debitkarte|EC[-\s]?Karte)\b/i, 'EC-Karte'],
    [/\bBarzahlung|Bargeld|BAR\b/i, 'Bar'],
  ];
  const clean = text.replace(/Kartennummer[^\n]*/gi, '');
  for (const [rx, method] of rules) {
    if (rx.test(clean)) return { method, explicit: true };
  }
  return { method: 'Bar', explicit: false };
}

function parseReceiptNumber(text: string): string {
  const rx =
    /(?:Rechnungs-?(?:Nr\.?|Nummer)|Invoice\s*No\.?|Bon-?Nr\.?|Beleg-?Nr\.?|Quittung[s-]?Nr\.?|Transaktions-?Nr\.?|TA-?Nr\.?)[:\s#]*([A-Z0-9\-\/]{3,30})/i;
  const m = text.match(rx);
  return m ? m[1].trim() : '';
}

function parseItems(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const stop =
    /^(summe|gesamt|total|mwst|ust|zahlung|rueck|rück|gegeben|danke|quittung|rechnung|kasse|iban|bic|steuer)/i;
  const amtEnd = /([0-9]{1,5}[,.][0-9]{2})\s*[A-Za-z€]?\s*$/;
  const items: string[] = [];
  for (const line of lines) {
    if (stop.test(line)) break;
    const m = line.match(amtEnd);
    if (!m) continue;
    const value = toNum(m[1]);
    if (value <= 0 || value > 100000) continue;
    const name = line.replace(amtEnd, '').trim().replace(/\s{2,}/g, ' ');
    if (name.length >= 2 && name.length <= 70) items.push(`${name}: ${normalizeAmount(m[1])}`);
    if (items.length >= 25) break;
  }
  return items.join('\n');
}

function detectCurrency(text: string): string {
  if (/\bCHF\b/.test(text)) return 'CHF';
  if (/\bGBP\b|\£\d/.test(text)) return 'GBP';
  if (/\bUSD\b|\$\d/.test(text)) return 'USD';
  if (/\bPLN\b/.test(text)) return 'PLN';
  if (/\bCZK\b/.test(text)) return 'CZK';
  if (/\bUAH\b|₴/.test(text)) return 'UAH';
  return 'EUR';
}

// Main entry
export async function extractReceiptData(file: File, onProgress?: ScanProgressCallback): Promise<ScannedReceiptData> {
  let rawText = '';
  onProgress?.(3, 'Datei wird gelesen...');

  try {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      rawText = await extractTextFromPDF(file);
      if (!rawText || rawText.trim().length < 40) {
        onProgress?.(12, 'PDF ohne Text – OCR...');
        const imageFile = await renderPdfFirstPageToImage(file, 2.6);
        rawText = await extractTextFromImage(imageFile, onProgress);
      } else {
        onProgress?.(78, 'Daten werden extrahiert...');
      }
    } else {
      rawText = await extractTextFromImage(file, onProgress);
    }
  } catch {
    onProgress?.(78, 'Daten werden extrahiert...');
  }

  const text = fixOCRErrors(rawText);
  const total = parseTotal(text);
  const date = parseDate(text);
  const store_name = parseStoreName(text);
  const vat = parseVAT(text, total);
  const paymentResult = parsePaymentMethod(text);
  const receipt_number = parseReceiptNumber(text);
  const items = parseItems(text);
  const currency = detectCurrency(text);
  const today = new Date().toISOString().split('T')[0];

  const detectedFields = new Set<string>();
  if (store_name) detectedFields.add('store_name');
  if (total) detectedFields.add('total');
  if (date && date !== today) detectedFields.add('date');
  if (vat.enabled) detectedFields.add('vat');
  if (paymentResult.explicit) detectedFields.add('payment_method');
  if (receipt_number) detectedFields.add('receipt_number');
  if (items) detectedFields.add('items');

  let confidence = 0;
  if (store_name) confidence += 20;
  if (total) confidence += 35;
  if (detectedFields.has('date')) confidence += 15;
  if (vat.enabled) confidence += 15;
  if (receipt_number) confidence += 5;
  if (items) confidence += 10;

  onProgress?.(100, 'Fertig');

  return {
    store_name,
    date,
    total,
    amount_net: vat.net,
    vat_amount: vat.vat,
    vat_rate: vat.rate,
    vat_enabled: vat.enabled,
    payment_method: paymentResult.method,
    receipt_number,
    items,
    currency,
    confidence,
    detectedFields,
  };
}