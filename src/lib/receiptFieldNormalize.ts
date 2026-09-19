/**
 * Shared normalization for AI / OCR receipt payloads.
 * Handles Spanish/EU formats: comma decimals, DD/MM/YYYY, TARJETA, field aliases.
 */

import { normalizeExpenseCategory } from './expenseCategories';
import { normalizeReceiptDate } from './receiptDateParse';

export type RawReceiptPayload = Record<string, unknown>;

const MERCHANT_KEYS = [
  'merchant',
  'store_name',
  'store',
  'vendor',
  'vendor_name',
  'supplier',
  'business_name',
  'name',
  'comercio',
  'establecimiento',
];

const TOTAL_KEYS = [
  'total_amount',
  'total',
  'amount',
  'amount_gross',
  'gross_total',
  'grand_total',
  'importe_total',
  'importe',
  'total_eur',
  'summe',
  'betrag',
];

const DATE_KEYS = ['date', 'receipt_date', 'document_date', 'fecha', 'transaction_date'];

const CURRENCY_KEYS = ['currency', 'currency_code', 'divisa', 'moneda'];

const CATEGORY_KEYS = ['category', 'expense_category', 'categoria'];

const PAYMENT_KEYS = [
  'payment_method',
  'payment',
  'paymentMethod',
  'forma_pago',
  'metodo_pago',
];

const ITEMS_KEYS = ['items', 'line_items', 'positions', 'lines', 'articulos'];

const RECEIPT_NO_KEYS = [
  'receipt_number',
  'receipt_no',
  'invoice_number',
  'document_number',
  'numero',
  'n_factura',
  'factura',
  'ticket',
  'ticket_number',
];

/** Known EU grocers / brands often printed as ALL CAPS headers. */
const KNOWN_MERCHANT_PATTERNS: [RegExp, string][] = [
  [/\bMERCADONA\b/i, 'Mercadona'],
  [/\bCARREFOUR\b/i, 'Carrefour'],
  [/\bLIDL\b/i, 'LIDL'],
  [/\bALDI\b/i, 'ALDI'],
  [/\bDIA\b/i, 'DIA'],
  [/\bREWE\b/i, 'REWE'],
  [/\bEDEKA\b/i, 'EDEKA'],
  [/\bPENNY\b/i, 'PENNY'],
  [/\bEL\s+CORTE\s+INGL[EÉ]S\b/i, 'El Corte Inglés'],
  [/\bAVANZA(?:\s+LEVANTE)?\b/i, 'AVANZA'],
];

function firstString(obj: RawReceiptPayload, keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (v == null) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return '';
}

/** Unwrap common model wrappers: { data }, { receipt }, { result }, { fields }. */
export function unwrapReceiptPayload(raw: unknown): RawReceiptPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  let cur = raw as RawReceiptPayload;

  for (let i = 0; i < 3; i++) {
    const nestedKeys = ['data', 'receipt', 'result', 'fields', 'extracted', 'ocr'];
    let next: unknown;
    for (const k of nestedKeys) {
      const candidate = cur[k];
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        // Prefer nested object if it looks like receipt fields
        const c = candidate as RawReceiptPayload;
        if (
          MERCHANT_KEYS.some((mk) => c[mk] != null) ||
          TOTAL_KEYS.some((tk) => c[tk] != null) ||
          DATE_KEYS.some((dk) => c[dk] != null)
        ) {
          next = c;
          break;
        }
      }
    }
    if (!next) break;
    cur = next as RawReceiptPayload;
  }
  return cur;
}

/**
 * Parse EU/US amounts: "17,59", "17.59", "1.234,56", "1,234.56", "17,59 €".
 * Returns positive finite number or NaN.
 */
export function parseReceiptAmount(raw: unknown): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : NaN;
  }
  if (raw == null) return NaN;
  let s = String(raw).trim();
  if (!s) return NaN;

  s = s
    .replace(/\s/g, '')
    .replace(/[€$£₴]/g, '')
    .replace(/\b(?:EUR|USD|GBP|CHF|UAH|PLN)\b/gi, '')
    .trim();

  // Keep trailing digits / separators only
  const m = s.match(/-?\d[\d.,]*/);
  if (!m) return NaN;
  s = m[0];

  if (s.includes(',') && s.includes('.')) {
    // Last separator is decimal
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    const parts = s.split(',');
    s =
      parts[parts.length - 1].length <= 2
        ? parts.slice(0, -1).join('').replace(/\./g, '') + '.' + parts[parts.length - 1]
        : s.replace(/,/g, '');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function formatAmount2(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  return n.toFixed(2);
}

/** Map free-text / ES/DE/EN payment labels onto review select values. */
export function normalizePaymentMethod(raw: unknown): { method: string; explicit: boolean } {
  const s = String(raw || '').trim();
  if (!s) return { method: 'Bar', explicit: false };

  const rules: [RegExp, string][] = [
    [/apple\s*pay/i, 'Apple Pay'],
    [/google\s*pay/i, 'Google Pay'],
    [/samsung\s*pay/i, 'Samsung Pay'],
    [/american\s*express|\bamex\b/i, 'American Express'],
    [/\bmastercard\b/i, 'Mastercard'],
    [/\bvisa\b/i, 'Visa'],
    [/\bmaestro\b/i, 'Maestro'],
    [/ec[-\s]?karte|\bgirocard\b|\bec\b/i, 'EC-Karte'],
    [/tarjeta\s*(bancaria|de\s*cr[eé]dito|de\s*d[eé]bito)|tarjeta|card\b|credit\s*card|debit\s*card|kreditkarte|debitkarte|bank\s*card/i, 'Kreditkarte'],
    [/paypal/i, 'PayPal'],
    [/twint/i, 'TWINT'],
    [/sepa|überweisung|ueberweisung|transfer/i, 'Überweisung'],
    [/scheck|cheque/i, 'Scheck'],
    [/barzahlung|bargeld|\bcash\b|\bbar\b|\befectivo\b|\bmet[aá]lico\b/i, 'Bar'],
  ];

  for (const [rx, method] of rules) {
    if (rx.test(s)) return { method, explicit: true };
  }
  // Unknown non-empty → keep as Kreditkarte if looks card-like, else pass through truncated
  if (/card|karte|tarjeta/i.test(s)) return { method: 'Kreditkarte', explicit: true };
  return { method: s.slice(0, 40), explicit: true };
}

/**
 * Normalize date; if year is absurdly old vs "now" but day/month look like
 * a recent receipt (e.g. model hallucinated 2023), bump to current year when
 * the MM-DD is within the last ~14 months of "today".
 */
export function normalizeReceiptDateSafe(
  raw: unknown,
  now: Date = new Date(),
): string {
  let s = String(raw || '').trim();
  if (!s) return '';

  // Strip time portion: "18/09/2026 21:34" / ISO datetime
  s = s.replace(/[T\s]\d{1,2}:\d{2}(:\d{2})?.*$/, '').trim();

  let iso = normalizeReceiptDate(s);
  if (!iso) return '';

  const y = parseInt(iso.slice(0, 4), 10);
  const currentY = now.getUTCFullYear();
  // Model often defaults Spanish receipts to 2023; correct when far from current year
  if (y < currentY - 1 || y > currentY + 1) {
    const md = iso.slice(5); // MM-DD
    const repaired = `${currentY}-${md}`;
    const probe = new Date(`${repaired}T12:00:00Z`);
    if (!Number.isNaN(probe.getTime())) {
      // If repaired date is > ~60 days in the future, use previous year
      const diffDays = (probe.getTime() - now.getTime()) / 86400000;
      if (diffDays > 60) {
        iso = `${currentY - 1}-${md}`;
      } else {
        iso = repaired;
      }
    }
  }
  return iso;
}

export function itemsToString(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          const name = String(o.name || o.description || o.item || '').trim();
          const price = parseReceiptAmount(o.total ?? o.price ?? o.amount ?? o.importe);
          if (name && Number.isFinite(price) && price > 0) return `${name}: ${formatAmount2(price)}`;
          return name;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

export type NormalizedReceiptFields = {
  merchant: string;
  total: string;
  date: string;
  currency: string;
  category: string;
  payment_method: string;
  payment_explicit: boolean;
  receipt_number: string;
  items: string;
};

/**
 * Pull merchant / TOTAL / payment / factura # from free OCR or model text
 * when structured JSON left them empty (common on Spanish thermal tickets).
 */
export function enrichFieldsFromText(
  fields: NormalizedReceiptFields,
  text: string,
): NormalizedReceiptFields {
  if (!text?.trim()) return fields;
  const out = { ...fields };

  if (!out.merchant?.trim()) {
    for (const [rx, name] of KNOWN_MERCHANT_PATTERNS) {
      if (rx.test(text)) {
        out.merchant = name;
        break;
      }
    }
    if (!out.merchant) {
      const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines.slice(0, 12)) {
        if (
          /[A-Za-zÁÉÍÓÚÑäöüß]{3,}/i.test(line) &&
          line.length <= 48 &&
          !/factura|simplificada|cif|nif|tel|av\.?\b|calle|c\/|total|tarjeta|fecha|iva\b/i.test(line)
        ) {
          out.merchant = line.replace(/\s{2,}/g, ' ');
          break;
        }
      }
    }
  }

  if (!out.total?.trim()) {
    const totalLine =
      text.match(
        /(?:TOTAL|IMPORTE\s*TOTAL|TOTAL\s*A\s*PAGAR|SUMA|TOTAL\s*€|TOTAL\s*EUR)[^\d\n]{0,20}(\d{1,5}[.,]\d{2})/i,
      ) || text.match(/\bTOTAL\b[^\n]{0,30}?(\d{1,5}[.,]\d{2})/i);
    if (totalLine) {
      const n = parseReceiptAmount(totalLine[1]);
      if (Number.isFinite(n) && n > 0) out.total = formatAmount2(n);
    }
  }

  if (!out.payment_explicit) {
    const pay = normalizePaymentMethod(
      /TARJETA|CARD|VISA|MASTERCARD|EFECTIVO|MET[AÁ]LICO|CASH|\bBAR\b/i.exec(text)?.[0] || '',
    );
    if (pay.explicit) {
      out.payment_method = pay.method;
      out.payment_explicit = true;
    }
  }

  if (!out.receipt_number?.trim()) {
    const factura =
      text.match(
        /(?:FACTURA\s+SIMPLIFICADA|N[º°o\.]*\s*(?:Factura|Ticket)?|Ticket\s*(?:No|Nr)?\.?|Fra\.?)[:\s#]*([A-Z0-9][A-Z0-9\-\/]{3,30})/i,
      ) || text.match(/\b(?:FAC|FRA|TCK)[-:\s]?([A-Z0-9\-\/]{4,24})\b/i);
    if (factura?.[1]) out.receipt_number = factura[1].trim();
  }

  if (!out.date?.trim()) {
    const d = normalizeReceiptDateSafe(
      text.match(/\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})(?:\s+\d{1,2}:\d{2})?/)?.[0] || '',
    );
    if (d) out.date = d;
  }

  // Grocery brands → food when category still generic
  if (
    (!out.category || out.category === 'other') &&
    /mercadona|carrefour|lidl|aldi|\bdia\b|rewe|edeka|penny|corte\s+ingl/i.test(
      `${out.merchant} ${text}`,
    )
  ) {
    out.category = 'food';
  }

  return out;
}

/** Normalize any AI/OCR JSON blob into display-ready receipt fields. */
export function normalizeReceiptFields(
  rawUnknown: unknown,
  now: Date = new Date(),
): NormalizedReceiptFields {
  const raw = unwrapReceiptPayload(rawUnknown);

  let merchant = firstString(raw, MERCHANT_KEYS);
  const totalNum = parseReceiptAmount(firstString(raw, TOTAL_KEYS) || raw.total_amount);
  let total = formatAmount2(totalNum);
  let date = normalizeReceiptDateSafe(firstString(raw, DATE_KEYS), now);
  const currency =
    (firstString(raw, CURRENCY_KEYS) || 'EUR').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) ||
    'EUR';
  let category = normalizeExpenseCategory(firstString(raw, CATEGORY_KEYS) || raw.category);
  let pay = normalizePaymentMethod(firstString(raw, PAYMENT_KEYS));
  let receipt_number = firstString(raw, RECEIPT_NO_KEYS);

  let items = '';
  for (const key of ITEMS_KEYS) {
    items = itemsToString(raw[key]);
    if (items) break;
  }

  // Also harvest free-text blobs the model sometimes stuffs into notes/raw_text
  const freeText = [
    items,
    firstString(raw, ['raw_text', 'ocr_text', 'text', 'full_text', 'notes', 'description']),
  ]
    .filter(Boolean)
    .join('\n');

  let fields: NormalizedReceiptFields = {
    merchant,
    total,
    date,
    currency,
    category,
    payment_method: pay.method,
    payment_explicit: pay.explicit,
    receipt_number,
    items,
  };

  if (freeText) {
    fields = enrichFieldsFromText(fields, freeText);
  }

  return fields;
}

/** Confidence based on fields that will actually show in the review UI. */
export function confidenceFromFields(f: {
  merchant?: string;
  total?: string;
  date?: string;
  category?: string;
  payment_explicit?: boolean;
  items?: string;
}): number {
  const hasMerchant = !!f.merchant?.trim();
  const hasTotal = !!f.total?.trim();

  // Critical fields empty → never show Lexware-like 90%+ confidence
  if (!hasMerchant && !hasTotal) return Math.min(15, 5 + (f.date ? 5 : 0) + (f.payment_explicit ? 5 : 0));
  if (!hasMerchant || !hasTotal) {
    let weak = 20;
    if (hasMerchant || hasTotal) weak += 15;
    if (f.date?.trim()) weak += 10;
    if (f.category && f.category !== 'other') weak += 5;
    if (f.payment_explicit) weak += 5;
    return Math.min(55, weak);
  }

  let c = 0;
  if (hasMerchant) c += 25;
  if (hasTotal) c += 35;
  if (f.date?.trim()) c += 15;
  if (f.category && f.category !== 'other') c += 10;
  if (f.payment_explicit) c += 5;
  if (f.items?.trim()) c += 5;
  return Math.min(99, c);
}
