
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export interface ScannedReceiptData {
  store_name: string;

export type ScanProgressCallback = (progress: number, status: string) => void;

interface NetBruttoResult {
  netto: string;
  mwst: string;
  brutto: string;
  rate: string;
}

interface VATResult {
  net: string;
  vat: string;
  rate: string;
  enabled: boolean;
}

// ─── Known Store Database ────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────
// Known store dictionary (helps to lock name & currency)
// ──────────────────────────────────────────────────────────
const KNOWN_STORES: [RegExp, string][] = [
  [/\bB\s*A\s*U\s*H\s*A\s*U\s*S\b/i, 'BAUHAUS'],
  [/\bBAUHAUS\b/i, 'BAUHAUS'],
  [/\bREWE\b/i, 'REWE'],
  [/\bEDEKA\b/i, 'EDEKA'],
  [/\bLIDL\b/i, 'LIDL'],
  [/\bALDI\s*(Nord|Süd|SÜD)?\b/i, 'ALDI'],
  [/\bALDI\b/i, 'ALDI'],
  [/\bPENNY\b/i, 'PENNY'],
  [/\bNETTO\b/i, 'NETTO'],
  [/\bKaufland\b/i, 'Kaufland'],
  [/\bTegut\b/i, 'Tegut'],
  [/\bNorma\b/i, 'Norma'],
  [/\bGlobus\b/i, 'Globus'],
  [/\bREAL\b/i, 'REAL'],
  [/\bKAUFLAND\b/i, 'Kaufland'],
  [/\bOBI\b/i, 'OBI'],
  [/\bIKEA\b/i, 'IKEA'],
  [/\bMETRO\b/i, 'METRO'],
  [/\bHIT[-\s]?Markt\b/i, 'HIT Markt'],
  [/\bDM\b(?:\s*[-–]\s*drogerie\s*markt)?/i, 'dm'],
  [/\bRossmann\b/i, 'Rossmann'],
  [/\bMüller\b/i, 'Müller'],
  [/\bDOUGLAS\b/i, 'DOUGLAS'],
  [/\bMediaMarkt\b/i, 'MediaMarkt'],
  [/\bSaturn\b/i, 'Saturn'],
  [/\bExpert\b/i, 'Expert'],
  [/\bEuronics\b/i, 'Euronics'],
  [/\bMcDonald'?s\b/i, "McDonald's"],
  [/\bBurger\s+King\b/i, 'Burger King'],
  [/\bSubway\b/i, 'Subway'],
  [/\bKFC\b/i, 'KFC'],
  [/\bDomino'?s\b/i, "Domino's"],
  [/\bPizza\s+Hut\b/i, 'Pizza Hut'],
  [/\bNordsee\b/i, 'Nordsee'],
  [/\bBackwerk\b/i, 'Backwerk'],
  [/\bShell\b/i, 'Shell'],
  [/\bARAL\b/i, 'ARAL'],
  [/\bBP\b/, 'BP'],
  [/\bSHELL\b/i, 'Shell'],
  [/\bESSO\b/i, 'ESSO'],
  [/\bJET\b/i, 'JET'],
  [/\bAral\s+Tankstelle\b/i, 'Aral Tankstelle'],
  [/\bTankstelle\b/i, 'Tankstelle'],
  [/\bIKEA\b/i, 'IKEA'],
  [/\bOBI\b/i, 'OBI'],
  [/\bHornbach\b/i, 'Hornbach'],
  [/\bToom\b/i, 'Toom'],
  [/\bH\s*&\s*M\b/i, 'H&M'],
  [/\bZara\b/i, 'Zara'],
  [/\bC\s*&\s*A\b/i, 'C&A'],
  [/\bPrimark\b/i, 'Primark'],
  [/\bStarbucks\b/i, 'Starbucks'],
  [/\bCosta\s+Coffee\b/i, 'Costa Coffee'],
  [/\bSpar\b/i, 'SPAR'],
  [/\bBilla\b/i, 'BILLA'],
  [/\bHofer\b/i, 'Hofer'],
  [/\bMercator\b/i, 'Mercator'],
  [/\bMigros\b/i, 'Migros'],
  [/\bCoop\b/i, 'Coop'],
  [/\bDENNER\b/i, 'DENNER'],
  [/\bVolg\b/i, 'Volg'],
  [/\bDeichmann\b/i, 'Deichmann'],
  [/\bZalando\b/i, 'Zalando'],
  [/\bAmazon\b/i, 'Amazon'],
  [/\bLexware\b/i, 'Lexware'],
  [/\bHaufe\b/i, 'Haufe'],
  [/\bDATEV\b/i, 'DATEV'],
  [/\bSAP\b/i, 'SAP'],
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

// ─── Image Preprocessing ─────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function normalizeAmount(raw: string): string {
  if (!raw) return '';
  const s = raw.trim().replace(/\s/g, '');
  const neg = s.startsWith('-');
  const abs = neg ? s.slice(1) : s;

  let val: string;
  if (abs.includes(',') && abs.includes('.')) {
    val = abs.lastIndexOf(',') > abs.lastIndexOf('.') ? abs.replace(/\./g, '').replace(',', '.') : abs.replace(/,/g, '');
  } else if (abs.includes(',')) {
    const parts = abs.split(',');
    val = parts[parts.length - 1].length <= 2 ? abs.replace(',', '.') : abs.replace(/,/g, '');
  } else {
    val = abs;
  }
  return neg ? `-${val}` : val;
}

function toNum(s: string): number {
  const n = parseFloat(normalizeAmount(s));
  return isNaN(n) ? 0 : n;
}

const fmt2 = (n: number) => n.toFixed(2);

const NUMBER_RX = /(?:^|[\s:€$])(-?\d{1,6}(?:[.,]\d{2})?)(?=\s*(?:€|EUR|$))/i;

// ──────────────────────────────────────────────────────────
// Image pre-processing
// ──────────────────────────────────────────────────────────
async function preprocessImage(file: File, onProgress?: ScanProgressCallback): Promise<Blob> {
  onProgress?.(7, 'Bild wird optimiert...');
  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        const maxDim = Math.max(img.width, img.height);
        const scale = maxDim < 2400 ? Math.min(4, 2400 / maxDim) : 1;
        const scale = Math.min(4, maxDim < 2400 ? 2400 / maxDim : 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        const gray = new Uint8Array(d.length >> 2);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = data.data;
        // simple threshold
        for (let i = 0; i < d.length; i += 4) {
          gray[i >> 2] = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          const bin = g > 140 ? 255 : 0;
          d[i] = bin;
          d[i + 1] = bin;
          d[i + 2] = bin;
          d[i + 3] = 255;
        }

        let lo = 255, hi = 0;
        for (let i = 0; i < gray.length; i++) {
          if (gray[i] < lo) lo = gray[i];
          if (gray[i] > hi) hi = gray[i];
        }
        const range = hi - lo || 1;

        for (let i = 0; i < gray.length; i++) {
          const v = Math.round(((gray[i] - lo) / range) * 255);
          const bin = v > 130 ? 255 : 0;
          const p = i << 2;
          d[p] = bin; d[p + 1] = bin; d[p + 2] = bin; d[p + 3] = 255;
        }

        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob')), 'image/png');
      } catch (e) { reject(e); }
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

// ─── PDF Extraction (line-preserving) ────────────────────────────────────────
// ──────────────────────────────────────────────────────────
// PDF text extraction (line preserving)
// ──────────────────────────────────────────────────────────
async function extractTextFromPDF(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const allLines: string[] = [];
  const lines: string[] = [];

  for (let p = 1; p <= Math.min(pdf.numPages, 4); p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const byY = new Map<number, { x: number; text: string }[]>();
    for (const item of content.items) {
      if (!('str' in item) || !(item as any).str.trim()) continue;
      const tx = (item as any).transform;
      const y = Math.round(tx[5] / 2) * 2;
    for (const item of content.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 2) * 2;
      if (!byY.has(y)) byY.set(y, []);
      byY.get(y)!.push({ x: tx[4], text: (item as any).str });
      byY.get(y)!.push({ x: item.transform[4], text: item.str });
    }
    const sortedYs = [...byY.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const parts = byY.get(y)!.sort((a, b) => a.x - b.x);
      allLines.push(parts.map(p => p.text).join('  '));
    const ys = [...byY.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      lines.push(byY.get(y)!.sort((a, b) => a.x - b.x).map((t) => t.text).join('  '));
    }
    allLines.push('');
    lines.push('');
  }
  return allLines.join('\n');
  return lines.join('\n');
}

// ─── PDF To Image (for image-only PDFs) ────────────────────────────────────────
async function renderPdfFirstPageToImage(file: File, scale = 2): Promise<File> {
// ──────────────────────────────────────────────────────────
// Render first PDF page to PNG (for scanned PDFs)
// ──────────────────────────────────────────────────────────
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
      resolve(new File([blob], `${file.name.replace(/\.pdf$/i, '')}-page1.png`, { type: 'image/png' }));
    }, 'image/png');
  });
}

// ─── OCR (Image) ─────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────
// OCR for image
// ──────────────────────────────────────────────────────────
async function extractTextFromImage(file: File, onProgress?: ScanProgressCallback): Promise<string> {
  onProgress?.(5, 'Bild wird vorbereitet...');

  let src: Blob = file;
  try { src = await preprocessImage(file, onProgress); } catch { /* use original */ }
  try {
    src = await preprocessImage(file, onProgress);
  } catch {
    /* keep original */
  }
  onProgress?.(13, 'OCR-Engine wird geladen...');

  const worker = await createWorker('deu+eng', 1, {
    await worker.setParameters({
      tessedit_pageseg_mode: '4' as any,
      tessedit_char_whitelist:
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
        'ÄÖÜäöüß.,:-€/*#+%@&()[]{}!\'"/ ',
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß.,:-€/*#+%@&()[]{}!\'"/ ',
    } as any);
    const { data } = await worker.recognize(src);
    onProgress?.(80, 'Daten werden analysiert...');
  }
}

// ─── OCR Error Correction ─────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────
// OCR post-processing
// ──────────────────────────────────────────────────────────
function fixOCRErrors(text: string): string {
  return text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    // Fix common digit-letter confusions in numeric context
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(?<=\d)[oO](?=\d)/g, '0')
    .replace(/(?<=\d)[lI|](?=\d)/g, '1')
    .replace(/(?<=\d)S(?=\d)/g, '5')
    .replace(/(?<=\d)B(?=\d)/g, '8')
    .replace(/(?<=\d)G(?=\d)/g, '6')
    .replace(/(?<=\s|^)O(?=\d)/gm, '0')
    // Normalize separators
    .replace(/\s{3,}/g, '  ')
    .trim();
}

// ─── Amount Helpers ───────────────────────────────────────────────────────────
function normalizeAmount(raw: string): string {
  if (!raw) return '';
  const s = raw.trim().replace(/\s/g, '');
  const neg = s.startsWith('-');
  const abs = neg ? s.slice(1) : s;
  let r: string;
  if (abs.includes(',') && abs.includes('.')) {
    r = abs.lastIndexOf(',') > abs.lastIndexOf('.')
      ? abs.replace(/\./g, '').replace(',', '.')
      : abs.replace(/,/g, '');
  } else if (abs.includes(',')) {
    const parts = abs.split(',');
    r = parts[parts.length - 1].length <= 2
      ? abs.replace(',', '.')
      : abs.replace(/,/g, '');
  } else {
    r = abs;
  }
  return neg ? `-${r}` : r;
// ──────────────────────────────────────────────────────────
// Parsers
// ──────────────────────────────────────────────────────────
function parseDate(text: string): string {
  const rx = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/;
  const m = text.match(rx);
  if (!m) return '';
  const [_, d, mo, y] = m;
  const year = y.length === 2 ? `20${y}` : y.padStart(4, '20');
  const mm = mo.padStart(2, '0');
  const dd = d.padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function toNum(s: string): number {
  const n = parseFloat(normalizeAmount(s));
  return isNaN(n) ? 0 : n;
}

function fmt2(n: number): string { return n.toFixed(2); }

// ─── NETTO / MWST / BRUTTO table parser ──────────────────────────────────────
// Handles formats like:
//   "C 19%  NETTO 50,38€  MWST 9,57€  BRUTTO 59,95€"  (BAUHAUS)
//   "NETTO  120,61 EUR  BRUTTO  143,53 EUR"             (Aral separate line)
//   "Gesamt Netto  37,85"  +  "Gesamtbetrag EUR  45,04" (Lexware)
function parseNetBruttoTable(text: string): NetBruttoResult | null {
  for (const line of text.split('\n')) {
    // Full table on one line: [category] RATE%  NETTO x€  MWST y€  BRUTTO z€
    const full = line.match(
      /(?:[A-Z]\s+)?(\d+)[,.]?\d*\s*%\s+NETTO\s+([0-9.,]+)[€]?\s+(?:MWST|MwSt\.?)\s+([0-9.,]+)[€]?\s+BRUTTO\s+([0-9.,]+)/i
    );
    if (full) {
      return {
        rate: full[1],
        netto: normalizeAmount(full[2]),
        mwst: normalizeAmount(full[3]),
        brutto: normalizeAmount(full[4]),
      };
    }

    // NETTO + BRUTTO on same line (no MWST column): "NETTO 120,61 EUR BRUTTO 143,53 EUR"
    const nb = line.match(/NETTO\s+([0-9.,]+)\s*(?:EUR|€)?\s+BRUTTO\s+([0-9.,]+)/i);
    if (nb) {
      const netto = normalizeAmount(nb[1]);
      const brutto = normalizeAmount(nb[2]);
      const mwstVal = toNum(brutto) - toNum(netto);
      const rate = mwstVal > 0 ? detectRateFromMwst(mwstVal, toNum(netto)) : '19';
      return { rate, netto, mwst: fmt2(mwstVal), brutto };
    }
  }

  // Lexware-style: separate lines for Gesamt Netto and Gesamtbetrag
  const netoM = text.match(/Gesamt\s+Netto\s+([0-9.,]+)/i);
  const brutM = text.match(/Gesamtbetrag\s+(?:EUR\s+)?([0-9.,]+)/i);
  const vatM = text.match(/MwSt\.?\s+(\d+)\s*%\s+von\s+[0-9.,]+\s+EUR\s+([0-9.,]+)/i);
  if (netoM && brutM) {
    const netto = normalizeAmount(netoM[1]);
    const brutto = normalizeAmount(brutM[1]);
    const mwst = vatM ? normalizeAmount(vatM[2]) : fmt2(toNum(brutto) - toNum(netto));
    const rate = vatM ? vatM[1] : '19';
    return { rate, netto, mwst, brutto };
  }

  return null;
}

function detectRateFromMwst(mwst: number, netto: number): string {
  if (netto <= 0) return '19';
  const rate = Math.round((mwst / netto) * 100);
  if (rate >= 17 && rate <= 21) return '19';
  if (rate >= 5 && rate <= 9) return '7';
  if (rate >= 8 && rate <= 12) return '10';
  return '19';
}

// ─── Total Amount ─────────────────────────────────────────────────────────────
function parseTotal(text: string, table: NetBruttoResult | null): string {
  if (table?.brutto) return table.brutto;

function parseTotal(text: string): string {
  const lines = text.split('\n');
  const scoreLine = (line: string) => {
    if (/gesamt|summe|total|amount due|zahlbetrag|brutto/i.test(line)) return 3;
    if (/eur|€/.test(line)) return 1;
    return 0;
  };

  // Keyword lines: SUMME, TOTAL, GESAMT, ZU ZAHLEN, etc.
  // "SUMME [1]  EUR  59,95" → pick last amount on the line
  const kwRx = /SUMME(?:\s*\[\d+\])?|ZU\s*ZAHLEN|GESAMT(?:\s*BRUTTO)?|GESAMTBETRAG|RECHNUNGSBETRAG|ENDBETRAG|ENDSUMME|Gesamtbetrag|Rechnungsbetrag|TOTAL(?:\s+EUR)?|zu\s+bezahlen|Zahlung\s+erhalten/i;

  let best = '';
  let bestScore = -1;
  for (const line of lines) {
    if (kwRx.test(line)) {
      // Skip "ZURÜCK" lines with negative amounts
      if (/ZURÜCK|ZURUCKGELD|RÜCKGELD|WECHSELGELD/i.test(line)) continue;
      const nums = [...line.matchAll(/([0-9]{1,6}[,.][0-9]{2})/g)];
      if (nums.length > 0) {
        const last = nums[nums.length - 1][1];
        const v = toNum(last);
        if (v > 0 && v < 200000) return normalizeAmount(last);
      }
    const m = line.match(NUMBER_RX);
    if (!m) continue;
    const score = scoreLine(line) + (line.length < 60 ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = m[1];
    }
  }

  // ** amount (common on German receipts)
  const star = text.match(/\*\*\s*([0-9]{1,6}[,.][0-9]{2})/);
  if (star) { const v = toNum(star[1]); if (v > 0 && v < 200000) return normalizeAmount(star[1]); }

  // Standalone EUR line: "143,53 EUR" alone
  for (const line of lines) {
    const m = line.match(/^\s*([0-9]{1,6}[,.][0-9]{2})\s*(?:EUR|€)\s*$/);
    if (m) { const v = toNum(m[1]); if (v > 0 && v < 200000) return normalizeAmount(m[1]); }
  }

  // Fallback: largest positive amount (exclude ZURÜCK/change/negative context)
  const amts = [...text.matchAll(/([0-9]{1,6}[,.][0-9]{2})/g)]
    .map(m => toNum(m[1]))
    .filter(v => v > 0 && v < 200000);
  return amts.length ? normalizeAmount(String(Math.max(...amts))) : '';
}

// ─── Date ─────────────────────────────────────────────────────────────────────
function tryParseDate(s: string): string | null {
  // YYYY-MM-DD (ISO)
  const ymd = s.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
  if (ymd) {
    const y = parseInt(ymd[1]), mo = parseInt(ymd[2]), d = parseInt(ymd[3]);
    if (y >= 2000 && y <= 2099 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
    }
  }
  // DD.MM.YYYY
  const dmy4 = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (dmy4) {
    const d = parseInt(dmy4[1]), mo = parseInt(dmy4[2]), y = parseInt(dmy4[3]);
    if (y >= 2000 && y <= 2099 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${dmy4[3]}-${dmy4[2].padStart(2, '0')}-${dmy4[1].padStart(2, '0')}`;
    }
  }
  // DD.MM.YY
  const dmy2 = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2})$/);
  if (dmy2) {
    const d = parseInt(dmy2[1]), mo = parseInt(dmy2[2]);
    const y = parseInt(dmy2[3]) < 50 ? 2000 + parseInt(dmy2[3]) : 1900 + parseInt(dmy2[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${y}-${dmy2[2].padStart(2, '0')}-${dmy2[1].padStart(2, '0')}`;
    }
  }
  return null;
}

function parseDate(text: string): string {
  const today = new Date().toISOString().split('T')[0];

  // Strip TSE/Fiskal section (contains ISO timestamps that could confuse date detection)
  const tseIdx = text.search(/(?:TSE\s+Transaktionsnummer|Fiskal-Information|Technische\s+Sicherheit|Start:\s+\d{4}-\d{2}-\d{2}T)/i);
  const safeText = tseIdx > 0 ? text.slice(0, tseIdx) : text;

  // Context: keyword + date on same line
  const ctxMatch = safeText.match(
    /(?:Rechnungsdatum|Belegdatum|Datum\/Uhrzeit|Datum|Date|Beleg\s*vom)[:\s]+(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})/i
  );
  if (ctxMatch) {
    const p = tryParseDate(ctxMatch[1]);
    if (p) return p;
  if (!best) {
    const nums = [...text.matchAll(NUMBER_RX)].map((m) => toNum(m[1])).filter((n) => n > 0);
    if (nums.length) best = fmt2(Math.max(...nums));
  }

  // #NNNNN DD.MM.YY HH:MM pattern (Aral receipts)
  const receiptLine = safeText.match(/#\d+\s+(\d{1,2}[.]\d{2}[.]\d{2})\s+\d{2}:\d{2}/);
  if (receiptLine) {
    const p = tryParseDate(receiptLine[1]);
    if (p) return p;
  }

  // Scan all date-like strings (prefer DD.MM.YYYY over DD.MM.YY)
  const candidates: string[] = [];
  for (const m of safeText.matchAll(/(\d{1,2}[.]\d{2}[.]\d{4})/g)) candidates.push(m[1]);
  for (const m of safeText.matchAll(/(\d{4}[-]\d{2}[-]\d{2})/g)) candidates.push(m[1]);
  for (const m of safeText.matchAll(/(\d{1,2}[.]\d{2}[.]\d{2})(?!\d)/g)) candidates.push(m[1]);

  for (const c of candidates) {
    const p = tryParseDate(c);
    if (p) return p;
  }

  return today;
}

// ─── Store Name ───────────────────────────────────────────────────────────────
function stripAddressSuffix(name: string): string {
  return name
    .replace(/\s*[·•]\s*.+$/, '')
    .replace(/,\s*\d{4,5}\s+\S.+$/, '')
    .replace(/\s+\d{4,5}\s+\S.+$/, '')
    .replace(/,?\s*(?:Straße|Str\.|Gasse|Platz|Weg|Allee|Ring|Damm)\s+\d.+$/i, '')
    .replace(/[|\\<>{}[\]]/g, '')
    .trim();
  return normalizeAmount(best);
}

function parseStoreName(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);

  // 1. Known store patterns (scan first 20 lines) — return canonical brand name
  for (const line of lines.slice(0, 20)) {
    for (const [rx, brandName] of KNOWN_STORES) {
      if (rx.test(line)) return brandName;
    }
  }

  // 2. A4 invoice: "Rechnungssteller" / "Absender" / "Von:" label followed by name
  const issuerM = text.match(/(?:Rechnungssteller|Absender|Aussteller|Von)[:\s]+([^\n]{4,60})/i);
  if (issuerM) {
    const name = stripAddressSuffix(issuerM[1]);
    if (name.length >= 3) return name;
  for (const [rx, name] of KNOWN_STORES) {
    if (rx.test(text)) return name;
  }

  // 3. Company legal form (GmbH, AG, KG, etc.) anywhere in first 30 lines
  //    Extract just the company name, stripping address suffix
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const skip = /^[\d\s€.,\-*\/+%:=|#@_]{3,}$/i;
  for (const line of lines.slice(0, 30)) {
    if (/GmbH|(?<!\w)AG(?!\w)|(?<!\w)KG(?!\w)|OHG|e\.K\.|e\.V\.|SE(?!\w)|mbH/.test(line)) {
      const name = stripAddressSuffix(line);
      if (name.length >= 4 && name.length <= 80) return name;
    }
  }

  // 4. First meaningful non-numeric, non-metadata line
  const skip = /^[\d\s€.,\-*\/+%:=|#@_]{3,}$|^(?:steuer|mwst|ust|summe|datum|kasse|bon\b|quittung|rechnung(?:\s*nr)?|seite|page|tel[.:]|fax|www\.|http|iban|bic|kassennr|kundennr|steuernr|internet|e-?mail)/i;
  for (const line of lines.slice(0, 14)) {
    if (line.length >= 3 && line.length <= 80 && !skip.test(line) && /[A-Za-zÄÖÜäöüß]{2}/.test(line)) {
      return stripAddressSuffix(line);
      return line.replace(/\s{2,}/g, ' ');
    }
  }
  return '';
}

// ─── VAT ──────────────────────────────────────────────────────────────────────
function parseVAT(text: string, total: string, table: NetBruttoResult | null): VATResult {
  const NONE: VATResult = { net: '', vat: '0.00', rate: '19', enabled: false };

  // From NETTO/MWST/BRUTTO table (highest priority)
  if (table) {
    const vatV = toNum(table.mwst);
    const netV = toNum(table.netto);
    if (vatV > 0 || netV > 0) {
      return { net: table.netto, vat: fmt2(vatV), rate: table.rate, enabled: true };
    }
  }

function parseVAT(text: string, total: string): { net: string; vat: string; rate: string; enabled: boolean } {
  const totalNum = toNum(total);
  const rxVatLine =
    /(?:MwSt\.?|MWST|USt\.?|VAT)\s*(?:=|\s)?:?\s*(\d{1,2}[.,]?\d*)\s*%\s*(?:=|:)?\s*([0-9.,]+)/gi;
  let m: RegExpExecArray | null;
  const entries: { rate: number; amount: number }[] = [];

  const push = (rate: number, amount: number) => {
    if (rate > 0 && rate <= 30 && amount > 0 && !entries.find(e => Math.abs(e.amount - amount) < 0.005)) {
      entries.push({ rate, amount });
    }
  };

  // Pattern: "MwSt. 19% von 37,85 EUR  7,19" (Lexware invoices)
  const vonRx = /MwSt\.?\s+(\d+)\s*%\s+von\s+[0-9.,]+\s+EUR\s+([0-9.,]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = vonRx.exec(text)) !== null) push(parseInt(m[1]), toNum(m[2]));

  // Pattern: "MWST 19,00% A  22,92 EUR" (Aral gas station)
  const aralRx = /(?:MWST|MwSt\.?)\s+(\d+)[,.]?\d*\s*%\s*[A-C]?\s+([0-9.,]+)\s*(?:EUR|€)/gi;
  while ((m = aralRx.exec(text)) !== null) push(parseInt(m[1]), toNum(m[2]));

  // Pattern: "MwSt. RATE%: AMOUNT" / "RATE% MwSt: AMOUNT"
  const rx1 = /(?:MwSt\.?|MWST|MWSt\.?|USt\.?|VAT)\s*(?:=\s*)?(\d+)\s*%[:\s€*]*([0-9]{1,6}[,.][0-9]{2})/gi;
  const rx2 = /(\d+)\s*%\s*(?:MwSt\.?|MWST|MWSt\.?|USt\.?)[:\s€*]*([0-9]{1,6}[,.][0-9]{2})/gi;
  const rx3 = /(?:darin|enthält|enthaltene?|inkl\.?)\s+(?:MwSt\.?\s*)?(\d+)\s*%[:\s€]*([0-9]{1,6}[,.][0-9]{2})/gi;
  for (const rx of [rx1, rx2, rx3]) {
    while ((m = rx.exec(text)) !== null) push(parseInt(m[1]), toNum(m[2]));
  while ((m = rxVatLine.exec(text)) !== null) {
    entries.push({ rate: parseFloat(m[1].replace(',', '.')), amount: toNum(m[2]) });
  }
  if (!entries.length) {
    return { net: '', vat: '0.00', rate: '19', enabled: false };
  }

  // German tax category markers: "A=19%" / "B=7%"
  const rxA = /(?:A\s*=\s*19|19\s*%\s*A).*?([0-9]{1,6}[,.][0-9]{2})/gi;
  const rxB = /(?:B\s*=\s*7|7\s*%\s*B).*?([0-9]{1,6}[,.][0-9]{2})/gi;
  while ((m = rxA.exec(text)) !== null) push(19, toNum(m[1]));
  while ((m = rxB.exec(text)) !== null) push(7, toNum(m[1]));

  if (entries.length === 0) return NONE;

  const totalVat = entries.reduce((s, e) => s + e.amount, 0);
  const dominant = entries.reduce((a, b) => b.amount > a.amount ? b : a);
  const net = totalNum > 0 ? fmt2(Math.max(0, totalNum - totalVat)) : '';

  // Also try to get net from explicit NETTO line
  const netoLine = text.match(/(?:^|\n)\s*NETTO\s+([0-9.,]+)\s*(?:EUR|€)/im);
  const explicitNet = netoLine ? normalizeAmount(netoLine[1]) : net;

  return { net: explicitNet || net, vat: fmt2(totalVat), rate: String(dominant.rate), enabled: true };
  const vat = entries.reduce((s, e) => s + e.amount, 0);
  const net = totalNum > 0 ? fmt2(Math.max(0, totalNum - vat)) : '';
  const dominant = entries.reduce((a, b) => (b.amount > a.amount ? b : a));
  return { net, vat: fmt2(vat), rate: String(dominant.rate || 19), enabled: true };
}

// ─── Payment Method ───────────────────────────────────────────────────────────
function parsePaymentMethod(text: string): { method: string; explicit: boolean } {
  const rules: [RegExp, string][] = [
    [/\bApple\s*Pay\b/i, 'Apple Pay'],
    [/\bVisa\b/i, 'Visa'],
    [/\bPayPal\b/i, 'PayPal'],
    [/\bTWINT\b/i, 'TWINT'],
    [/\bSEPA[-\s]?Lastschrift\b/i, 'SEPA-Lastschrift'],
    [/\bLastschrift\b/i, 'Lastschrift'],
    [/\b(?:EC|Girocard|Maestro|Debitkarte|EC[\s-]Karte)\b/i, 'EC-Karte'],
    [/\bKreditkarte\b/i, 'Kreditkarte'],
    [/\bÜberweisung\b/i, 'Überweisung'],
    [/\bScheck\b/i, 'Scheck'],
    // Cash: BAR / BARGELD as payment line with amount
    [/(?:^|\n)\s*(?:BAR|BARGELD|Barzahlung|Bar\s+gegeben|Gegeben)\s+(?:EUR\s+)?[0-9]/im, 'Bar'],
    [/\b(?:CASH)\b/i, 'Bar'],
    [/(?:EC|Girocard|Maestro|Debitkarte|EC[-\s]?Karte)\b/i, 'EC-Karte'],
    [/\bBarzahlung|Bargeld|BAR\b/i, 'Bar'],
  ];

  // Remove loyalty card lines before testing to avoid false positives
  const textWithoutLoyalty = text.replace(/Kartennummer[^\n]*/gi, '');

  const clean = text.replace(/Kartennummer[^\n]*/gi, '');
  for (const [rx, method] of rules) {
    if (rx.test(textWithoutLoyalty)) return { method, explicit: true };
    if (rx.test(clean)) return { method, explicit: true };
  }
  return { method: 'Bar', explicit: false };
}

// ─── Receipt / Bon Number ─────────────────────────────────────────────────────
function parseReceiptNumber(text: string): string {
  const rxs = [
    // Formal invoice number: "Rechnungsnummer  lx2025080030725"
    /(?:Rechnungs-?(?:Nr\.?|Nummer)|RE-?NR\.?|Invoice\s*No\.?|Faktura-?Nr\.?)[:\s#]*([A-Z0-9\-\/]{3,30})/i,
    // Bon / Beleg number
    /(?:Bon-?Nr\.?|BON-NR\.?|Bon-?Nummer|Belegnummer|Beleg-?Nr\.?|Quittungs-?Nr\.?|TA-?NR\.?|Transaktions-?Nr\.?)[:\s#]*([A-Z0-9\-\/]{1,20})/i,
    // #NNNNN at start of line (Aral style: "#53021 31.03.26 20:41")
    /(?:^|\n)\s*#(\d{3,10})\s+\d{2}[.]\d{2}/m,
    // BON / BN shorthand
    /\b(?:BON|BN|BE)\s*[-:\s]?(\d{3,10})\b/i,
    // BAUHAUS / POS-terminal footer line: "DD.MM.YY HH:MM STORE  NNN NNN NNNN"
    /\d{2}[.]\d{2}[.]\d{2}\s+\d{2}:\d{2}\s+\d{3}\s+(\d{3}\s+\d{3}\s+\d{4})/,
    // TSE Transaktionsnummer (fallback for German fiscal receipts)
    /TSE\s+Transaktionsnummer[:\s]*(\d+)/i,
  ];
  for (const rx of rxs) {
    const m = text.match(rx);
    if (m) return m[1].replace(/\s+/g, ' ').trim();
  }
  return '';
  const rx =
    /(?:Rechnungs-?(?:Nr\.?|Nummer)|Invoice\s*No\.?|Bon-?Nr\.?|Beleg-?Nr\.?|Quittung[s-]?Nr\.?|Transaktions-?Nr\.?|TA-?Nr\.?)[:\s#]*([A-Z0-9\-\/]{3,30})/i;
  const m = text.match(rx);
  return m ? m[1].trim() : '';
}

// ─── Items / Positions ────────────────────────────────────────────────────────
function parseItems(text: string): string {
  // Strip TSE / Fiskal sections entirely (irrelevant for items)
  const tseIdx = text.search(/(?:TSE\s+Transaktionsnummer|Fiskal-Information|Technische\s+Sicherheitseinrichtung|Start:\s*\d{4}-\d{2}-\d{2}T)/i);
  const cleanText = tseIdx > 0 ? text.slice(0, tseIdx) : text;

  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
  const result: string[] = [];

  const stop = /^(?:summe|gesamt|total|mwst|mwst\.|ust|zahlung\b|zurück|bar\b|ec[- ]|girocard|visa|mastercard|kreditkarte|wechsel(?:geld)?|rückgeld|gegeben|danke?|quittung|steuer(?:nr)?|betrag\b|rabatt|gutschein|kassierer|filiale|kasse\b|tel\.\s|telefon|fax|www\.|http|bon-?nr|datum\b|uhrzeit|iban|bic|kassenbon|unterschrift|umsatz|bonusfähig|kartennummer|garantie|steuernummer|signatur)/i;

  // Amount at end of line: "59,95 C" or "59,95" or "59,95€" or "59,95 ©"
  // More permissive: allow any 1-2 char suffix after amount (tax category markers)
  const amtEnd = /([0-9]{1,5}[,.][0-9]{2})\s*[A-Za-z©*€]?\s*$/;

  // Skip EAN/barcode-only lines
  const eanLine = /^(?:Art[.\s\/]?EAN|EAN|Artikel)\s+\d{8,}/i;

  let pendingDescription = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const stop =
    /^(summe|gesamt|total|mwst|ust|zahlung|rückgeld|gegeben|danke|quittung|rechnung|kasse|iban|bic|steuer)/i;
  const amtEnd = /([0-9]{1,5}[,.][0-9]{2})\s*[A-Za-z€]?\s*$/;
  const items: string[] = [];
  for (const line of lines) {
    if (stop.test(line)) break;
    if (/^\s*\*{3,}/.test(line)) continue;

    // EAN prefix line: remember context for next line
    if (eanLine.test(line)) {
      pendingDescription = '';
      continue;
    }

    // Pure number lines (barcode, serial numbers)
    if (/^[\d\s]{8,}$/.test(line)) continue;

    if (!/[A-Za-zÄÖÜäöüß]{2}/.test(line)) continue;

    const m = line.match(amtEnd);

    if (!m) {
      // Could be a description-only line — peek at next line for amount
      const nextLine = lines[i + 1];
      if (nextLine && !stop.test(nextLine)) {
        const nextM = nextLine.match(/^\s*([0-9]{1,5}[,.][0-9]{2})\s*[A-Za-z©*€]?\s*$/);
        if (nextM) {
          const v = toNum(nextM[1]);
          if (v > 0 && v < 100000) {
            const name = line
              .replace(/^\s*\*\s*/, '')
              .replace(/^\s*\d+\s*[xX]\s*/, '')
              .replace(/^\s*\d+\s+/, '')
              .trim()
              .replace(/\s{2,}/g, ' ');
            if (name.length >= 2 && name.length <= 70 && /[A-Za-zÄÖÜäöüß]/.test(name)) {
              result.push(`${name}: ${normalizeAmount(nextM[1])}`);
              i++; // skip the amount line
            }
          }
        } else {
          pendingDescription = line;
        }
      }
      continue;
    }

    const v = toNum(m[1]);
    if (v <= 0 || v > 100000) continue;

    let name = (pendingDescription || line)
      .replace(amtEnd, '')
      .replace(/^\s*\*\s*/, '')
      .replace(/^\s*\d+\s*[xX]\s*/, '')
      .replace(/^\s*\d+\s+/, '')
      .replace(/\s*[A-Za-z]\s*$/, '')
      .trim()
      .replace(/\s{2,}/g, ' ');

    pendingDescription = '';

    if (name.length >= 2 && name.length <= 70 && /[A-Za-zÄÖÜäöüß]/.test(name)) {
      result.push(`${name}: ${normalizeAmount(m[1])}`);
    if (!m) continue;
    const value = toNum(m[1]);
    if (value <= 0 || value > 100000) continue;
    const name = line.replace(amtEnd, '').trim().replace(/\s{2,}/g, ' ');
    if (name.length >= 2 && name.length <= 70) {
      items.push(`${name}: ${normalizeAmount(m[1])}`);
    }
    if (items.length >= 25) break;
  }
  return result.slice(0, 25).join('\n');
  return items.join('\n');
}

// ─── Currency ─────────────────────────────────────────────────────────────────
function detectCurrency(text: string): string {
  if (/\bCHF\b/.test(text)) return 'CHF';
  if (/\bGBP\b|£\d/.test(text)) return 'GBP';
  return 'EUR';
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────
export async function extractReceiptData(
  file: File,
  onProgress?: ScanProgressCallback
): Promise<ScannedReceiptData> {
// ──────────────────────────────────────────────────────────
// Main entry
// ──────────────────────────────────────────────────────────
export async function extractReceiptData(file: File, onProgress?: ScanProgressCallback): Promise<ScannedReceiptData> {
  let rawText = '';
  onProgress?.(3, 'Datei wird gelesen...');

  try {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      rawText = await extractTextFromPDF(file);
      // Якщо PDF не містить тексту (скан A4) — робимо OCR з рендеру першої сторінки
      if (!rawText || rawText.trim().length < 40) {
        onProgress?.(12, 'PDF без тексту — запускаємо OCR...');
        const imageFile = await renderPdfFirstPageToImage(file, 2.5);
        onProgress?.(12, 'PDF ohne Text – OCR...');
        const imageFile = await renderPdfFirstPageToImage(file, 2.6);
        rawText = await extractTextFromImage(imageFile, onProgress);
      } else {
        onProgress?.(78, 'Daten werden extrahiert...');
  }

  const text = fixOCRErrors(rawText);

  // Parse NETTO/MWST/BRUTTO table first — most reliable source
  const table = parseNetBruttoTable(text);

  const total = parseTotal(text, table);
  const total = parseTotal(text);
  const date = parseDate(text);
  const store_name = parseStoreName(text);
  const vat = parseVAT(text, total, table);
  const vat = parseVAT(text, total);
  const paymentResult = parsePaymentMethod(text);
  const payment_method = paymentResult.method;
  const receipt_number = parseReceiptNumber(text);
  const items = parseItems(text);
  const currency = detectCurrency(text);
  if (total) confidence += 35;
  if (detectedFields.has('date')) confidence += 15;
  if (vat.enabled) confidence += 15;
  if (table) confidence += 10;
  if (receipt_number) confidence += 5;
  if (items) confidence += 10;

  onProgress?.(100, 'Fertig');

    vat_amount: vat.vat,
    vat_rate: vat.rate,
    vat_enabled: vat.enabled,
    payment_method,
    payment_method: paymentResult.method,
    receipt_number,
    items,
    currency,