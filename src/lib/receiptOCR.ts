import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { parseDateFromText } from './receiptDateParse';

// Налаштування воркера pdf.js (обов'язково для браузерного середовища)
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
  /** Personal bookkeeping category (food, auto, …) */
  category: string;
  confidence: number;
  detectedFields: Set<string>;
  /** Soft OCR/AI warning for review UI (e.g. Edge 503). */
  warning?: {
    code: string;
    message: string;
  };
}

export type ScanProgressCallback = (progress: number, status: string) => void;

// Словник відомих магазинів для стабілізації назви
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
  [/\bAVANZA\s+LEVANTE\b/i, 'AVANZA LEVANTE'],
  [/\bAVANZA\b/i, 'AVANZA'],
  [/\bMERCADONA\b/i, 'Mercadona'],
  [/\bCARREFOUR\b/i, 'Carrefour'],
  [/\bDIA\b/i, 'DIA'],
  [/\bEL\s+CORTE\s+INGL[EÉ]S\b/i, 'El Corte Inglés'],
  [/\bREPSOL\b/i, 'Repsol'],
  [/\bCEPSA\b/i, 'Cepsa'],
];

const fmt2 = (n: number) => n.toFixed(2);

// Нормалізація числових рядків до формату з крапкою
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

// Попередня обробка зображення для OCR (бінаризація + масштабування)
async function preprocessImage(file: File, onProgress?: ScanProgressCallback): Promise<Blob> {
  onProgress?.(7, 'Готуємо зображення...');
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
        // Mild contrast stretch (avoid hard binarization that wipes thermal-print text)
        let min = 255;
        let max = 0;
        for (let i = 0; i < d.length; i += 4) {
          const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          if (g < min) min = g;
          if (g > max) max = g;
          d[i] = g;
          d[i + 1] = g;
          d[i + 2] = g;
        }
        const range = Math.max(1, max - min);
        for (let i = 0; i < d.length; i += 4) {
          const stretched = Math.round(((d[i] - min) / range) * 255);
          d[i] = stretched;
          d[i + 1] = stretched;
          d[i + 2] = stretched;
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

// Витяг тексту з PDF (перші 4 сторінки, зберігаємо порядок рядків)
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

// Рендер першої сторінки PDF у PNG (для сканованих чеків без текстового шару)
async function renderPdfFirstPageToImage(file: File, scale = 2.6): Promise<File> {
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
      resolve(new File([blob], `${file.name.replace(/\.pdf$/i, '')}-page1.png`, { type: 'image/png' }));
    }, 'image/png');
  });
}

// OCR для зображень
async function extractTextFromImage(file: File, onProgress?: ScanProgressCallback): Promise<string> {
  onProgress?.(5, 'Підготовка зображення...');
  let src: Blob = file;
  try {
    src = await preprocessImage(file, onProgress);
  } catch {
    // якщо попередня обробка не вдалася — беремо оригінал
  }

  onProgress?.(13, 'Завантаження OCR...');
  // eng+spa+deu: Spanish receipts (AGO months, TOTAL) + DE/EN fallbacks
  const worker = await createWorker('eng+spa+deu', 1, {
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        onProgress?.(15 + Math.round(m.progress * 62), 'Розпізнаємо текст...');
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: '4' as any,
      // Keep whitelist broad enough for Spanish/German merchant names & totals
      tessedit_char_whitelist:
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüßÁÉÍÓÚÑáéíóúñ.,:-€$£/*#+%@&()[]{}!\\'\"/ ",
    } as any);
    const { data } = await worker.recognize(src);
    onProgress?.(80, 'Аналіз даних...');
    return data.text;
  } finally {
    await worker.terminate();
  }
}

// Виправлення типових OCR-помилок
function fixOCRErrors(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(?<=\d)[oO]/g, '0')
    .replace(/(?<=\d)[lI|]/g, '1')
    .replace(/(?<=\d)S(?=\d)/g, '5')
    .replace(/(?<=\d)B(?=\d)/g, '8')
    .replace(/(?<=\d)G(?=\d)/g, '6')
    .replace(/\s{3,}/g, '  ')
    .trim();
}

// Парсинг дати (incl. Spanish 14/AGO/26)
function parseDate(text: string): string {
  return parseDateFromText(text);
}

// Парсинг підсумкової суми (з фокусом на низ чеку)
function parseTotal(text: string): string {
  const numberRx = /(-?\d{1,7}(?:[.,]\d{2})?)(?:\s*(?:€|EUR|USD|\$))?/g;
  const lines = text.split('\n');
  let best = '';
  let bestScore = -1;

  const scoreLine = (line: string, idx: number) => {
    let s = 0;
    if (
      /gesamt|summe|total|betrag|brutto|zahlbetrag|zu\s*zahlen|payable|amount\s*due|importe|total\s*a\s*pagar|a\s*pagar|suma|total\s*eur|total\s*€/i.test(
        line,
      )
    ) {
      s += 5;
    }
    if (/eur|€|usd|\$/.test(line)) s += 1;
    if (line.length < 60) s += 1;
    const fromBottom = lines.length - idx;
    if (fromBottom < 10) s += 2;
    return s;
  };

  lines.forEach((line, idx) => {
    if (/mwst|ust|steuer|iva\b|i\.?v\.?a\.?/i.test(line) && !/total|importe|suma|gesamt/i.test(line)) {
      return;
    }
    let m: RegExpExecArray | null;
    numberRx.lastIndex = 0;
    while ((m = numberRx.exec(line)) !== null) {
      const value = toNum(m[1]);
      if (value <= 0 || value > 100000) continue;
      const score = scoreLine(line, idx);
      if (score > bestScore || (score === bestScore && value > toNum(best))) {
        bestScore = score;
        best = m[1];
      }
    }
  });

  if (!best) {
    const tail = lines.slice(-8);
    let max = 0;
    for (const line of tail) {
      const matches = [...line.matchAll(numberRx)].map((m) => toNum(m[1]));
      const mmax = Math.max(0, ...matches);
      if (mmax > max) {
        max = mmax;
        best = fmt2(max);
      }
    }
  }

  if (!best) {
    const nums = [...text.matchAll(numberRx)].map((m) => toNum(m[1])).filter((n) => n > 0 && n < 100000);
    if (nums.length) best = fmt2(nums.sort((a, b) => b - a)[0]);
  }
  return normalizeAmount(best);
}

// Парсинг назви магазину
function parseStoreName(text: string, fileName?: string): string {
  for (const [rx, name] of KNOWN_STORES) {
    if (rx.test(text)) return name;
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const skip = /^[\d\s€.,\-*\/+%:=|#@_]{3,}$/;

  for (const line of lines.slice(0, 15)) {
    if (skip.test(line)) continue;
    if (
      (/[A-ZÄÖÜÁÉÍÓÚÑ]{3}/.test(line) || /[A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ]{4,}/.test(line)) &&
      line.length <= 50 &&
      !/nr\.?|no\.?|bon|beleg|rechnung|fecha|ticket|factura|cif|nif|tel/i.test(line)
    ) {
      return line.replace(/\s{2,}/g, ' ');
    }
  }
  for (const line of lines.slice(0, 35)) {
    if (
      line.length >= 3 &&
      line.length <= 80 &&
      !skip.test(line) &&
      /[A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ]{2}/.test(line) &&
      !/nr\.?|no\.?|bon|beleg|rechnung|fecha|ticket|factura|cif|nif|tel/i.test(line)
    ) {
      return line.replace(/\s{2,}/g, ' ');
    }
  }

  if (fileName) {
    const base = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    if (base.length >= 3) return base;
  }
  return '';
}

// Парсинг ПДВ
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
  const net = totalNum > 0 ? fmt2(Math.max(0, totalNum - vat)) : '';
  const dominant = entries.reduce((a, b) => (b.amount > a.amount ? b : a));
  return { net, vat: fmt2(vat), rate: String(dominant.rate || 19), enabled: true };
}

// Парсинг способу оплати
function parsePaymentMethod(text: string): { method: string; explicit: boolean } {
  const rules: [RegExp, string][] = [
    [/\bApple\s*Pay\b/i, 'Apple Pay'],
    [/\bGoogle\s*Pay\b/i, 'Google Pay'],
    [/\bSamsung\s*Pay\b/i, 'Samsung Pay'],
    [/\bAmerican\s*Express\b|\bAMEX\b/i, 'American Express'],
    [/\bMastercard\b/i, 'Mastercard'],
    [/\bVisa\b/i, 'Visa'],
    [/\bMaestro\b/i, 'Maestro'],
    [/\bEC[-\s]?Karte\b|\bEC\b|\bGirocard\b/i, 'EC-Karte'],
    [/\bDebit(?:karte)?\b/i, 'Debitkarte'],
    [/\bKreditkarte\b/i, 'Kreditkarte'],
    [/\bPayPal\b/i, 'PayPal'],
    [/\bTWINT\b/i, 'TWINT'],
    [/\bSEPA\b/i, 'SEPA-Lastschrift'],
    [/\bÜberweisung\b|\bUeberweisung\b/i, 'Überweisung'],
    [/\bRechnung\b/i, 'Rechnung'],
    [/\bBarzahlung\b|\bBargeld\b|\bBAR\b/i, 'Bar'],
  ];

  const clean = text.replace(/Kartennummer[^\n]*/gi, '');
  const footer = clean.split('\n').slice(-15).join('\n');

  for (const [rx, method] of rules) {
    if (rx.test(footer)) return { method, explicit: true };
  }
  for (const [rx, method] of rules) {
    if (rx.test(clean)) return { method, explicit: true };
  }
  return { method: 'Bar', explicit: false };
}

// Парсинг номера документа
function parseReceiptNumber(text: string): string {
  const rx =
    /(?:Rechnungs-?(?:Nr\.?|Nummer)|Invoice\s*No\.?|Invoice\s*#|Bon-?Nr\.?|Beleg-?Nr\.?|Quittung[s-]?Nr\.?|Transaktions-?Nr\.?|TA-?Nr\.?|Doc(?:ument)?\s*(?:No|Nr)?\.?|Receipt\s*No\.?)[:\s#]*([A-Z0-9\-\/]{3,40})/i;
  const m = text.match(rx);
  if (m) return m[1].trim();

  const tokens = text
    .split(/\s+/)
    .filter((t) => /^[A-Z0-9][A-Z0-9\-\/]{5,19}$/i.test(t) && /\d/.test(t)); // вимога хоча б однієї цифри
  return tokens[0] || '';
}

// Парсинг позицій
function parseItems(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const stop =
    /^(summe|gesamt|total|betrag|mwst|ust|zahlung|rueck|rück|gegeben|danke|quittung|rechnung|kasse|iban|bic|steuer|zahlbetrag)/i;

  const amtEnd = /([0-9]{1,5}[,.][0-9]{2})\s*[A-Za-z€]?\s*$/;
  const qtyAmt = /^\s*(\d{1,3})\s*[xX]\s*([0-9]{1,5}[,.][0-9]{2})\s+([0-9]{1,6}[,.][0-9]{2})/;

  const items: string[] = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (stop.test(line) && items.length > 0) break;

    // Формат "2 x 5,99 11,98"
    const qm = line.match(qtyAmt);
    if (qm) {
      const total = normalizeAmount(qm[3]);
      const name =
        lines[idx - 1] && !stop.test(lines[idx - 1]) && !amtEnd.test(lines[idx - 1])
          ? lines[idx - 1].replace(/\s{2,}/g, ' ')
          : `Позиція x${qm[1]}`;
      items.push(`${name}: ${total}`);
      continue;
    }

    const m = line.match(amtEnd);
    if (!m) continue;
    const value = toNum(m[1]);
    if (value <= 0 || value > 100000) continue;
    const name = line.replace(amtEnd, '').trim().replace(/\s{2,}/g, ' ');
    if (name.length >= 2 && name.length <= 70 && !stop.test(name.toLowerCase())) {
      items.push(`${name}: ${normalizeAmount(m[1])}`);
    }
    if (items.length >= 25) break;
  }
  return items.join('\n');
}

// Визначення валюти
function detectCurrency(text: string): string {
  if (/\bCHF\b/.test(text)) return 'CHF';
  if (/\bGBP\b|£\d/.test(text)) return 'GBP';
  if (/\bUSD\b|\$\d/.test(text)) return 'USD';
  if (/\bPLN\b/.test(text)) return 'PLN';
  if (/\bCZK\b/.test(text)) return 'CZK';
  if (/\bUAH\b|₴/.test(text)) return 'UAH';
  return 'EUR';
}

// Головна функція
export async function extractReceiptData(file: File, onProgress?: ScanProgressCallback): Promise<ScannedReceiptData> {
  let rawText = '';
  onProgress?.(3, 'Зчитуємо файл...');

  try {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      rawText = await extractTextFromPDF(file);
      // Якщо PDF фактично скан (немає текстового шару)
      if (!rawText || rawText.trim().length < 40) {
        onProgress?.(12, 'PDF без тексту — запускаємо OCR...');
        const imageFile = await renderPdfFirstPageToImage(file, 2.6);
        rawText = await extractTextFromImage(imageFile, onProgress);
      } else {
        onProgress?.(78, 'Отримуємо дані...');
      }
    } else {
      rawText = await extractTextFromImage(file, onProgress);
    }
  } catch {
    onProgress?.(78, 'Отримуємо дані...');
  }

  const text = fixOCRErrors(rawText);
  const total = parseTotal(text);
  const date = parseDate(text);
  const store_name = parseStoreName(text, file.name);
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

  onProgress?.(100, 'Готово');

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
    category: 'other',
    confidence,
    detectedFields,
  };
}