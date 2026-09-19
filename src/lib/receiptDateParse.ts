/** Month name / abbreviation → MM (lowercase keys). */
const MONTH_ALIASES: Record<string, string> = {
  // English
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
  // Spanish
  ene: '01',
  enero: '01',
  febrero: '02',
  marzo: '03',
  abr: '04',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  ago: '08',
  agosto: '08',
  septiembre: '09',
  set: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  dic: '12',
  diciembre: '12',
  // German
  januar: '01',
  februar: '02',
  märz: '03',
  maerz: '03',
  mrz: '03',
  mai: '05',
  juni: '06',
  juli: '07',
  oktober: '10',
  okt: '10',
  dez: '12',
  dezember: '12',
};

function pad2(n: string | number): string {
  return String(n).padStart(2, '0');
}

function year4(yy: string): string {
  if (yy.length === 4) return yy;
  const n = parseInt(yy, 10);
  if (!Number.isFinite(n)) return '';
  // Receipts: 00–79 → 2000–2079, 80–99 → 1980–1999
  return n >= 80 ? `19${pad2(n)}` : `20${pad2(n)}`;
}

function validYmd(y: string, m: string, d: string): string {
  const yi = parseInt(y, 10);
  const mi = parseInt(m, 10);
  const di = parseInt(d, 10);
  if (!yi || mi < 1 || mi > 12 || di < 1 || di > 31) return '';
  const dt = new Date(Date.UTC(yi, mi - 1, di));
  if (dt.getUTCFullYear() !== yi || dt.getUTCMonth() !== mi - 1 || dt.getUTCDate() !== di) {
    return '';
  }
  return `${y}-${pad2(mi)}-${pad2(di)}`;
}

/**
 * Normalize receipt dates to YYYY-MM-DD for <input type="date">.
 * Handles numeric and Spanish-style forms like 14/AGO/26, 14-AGO-2026.
 */
export function normalizeReceiptDate(raw: string): string {
  if (!raw) return '';
  // Strip time: "18/09/2026 21:34" or ISO datetime
  const s = raw.trim().replace(/[T\s]\d{1,2}:\d{2}(:\d{2})?.*$/, '').trim();

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return validYmd(iso[1], iso[2], iso[3]);

  const numeric = s.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (numeric) {
    return validYmd(year4(numeric[3]), pad2(numeric[2]), pad2(numeric[1]));
  }

  const named = s.match(
    /\b(\d{1,2})[\s./-]+([A-Za-zÄÖÜäöüß]{3,12})[\s./-]+(\d{2,4})\b/,
  );
  if (named) {
    const month = MONTH_ALIASES[named[2].toLowerCase()];
    if (month) return validYmd(year4(named[3]), month, pad2(named[1]));
  }

  const ymdSlash = s.match(/\b(\d{4})[./-](\d{1,2})[./-](\d{1,2})\b/);
  if (ymdSlash) return validYmd(ymdSlash[1], pad2(ymdSlash[2]), pad2(ymdSlash[3]));

  return '';
}

/** Find the best date string inside free OCR text. */
export function parseDateFromText(text: string): string {
  if (!text) return '';

  const namedAll = text.matchAll(
    /\b(\d{1,2})[\s./-]+([A-Za-zÄÖÜäöüß]{3,12})[\s./-]+(\d{2,4})\b/gi,
  );
  for (const m of namedAll) {
    const normalized = normalizeReceiptDate(m[0]);
    if (normalized) return normalized;
  }

  const numericAll = text.matchAll(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/g);
  for (const m of numericAll) {
    const normalized = normalizeReceiptDate(m[0]);
    if (normalized) return normalized;
  }

  const isoAll = text.matchAll(/\b(\d{4})[./-](\d{1,2})[./-](\d{1,2})\b/g);
  for (const m of isoAll) {
    const normalized = normalizeReceiptDate(m[0]);
    if (normalized) return normalized;
  }

  return '';
}
