/**
 * Home dashboard money aggregations.
 * Total received = sum of paid invoices (no expenses subtracted).
 * Total spent    = sum of ALL valid receipts/expenses (positive amounts).
 * Net profit     = received − spent.
 * Chart + cards share the same YTD window.
 */

import { normalizeReceiptDate } from './receiptDateParse';

export interface MonthData {
  month: string;
  income: number;
  expenses: number;
}

export interface MoneyTotals {
  received: number;
  spent: number;
  profit: number;
  months: MonthData[];
}

export type LedgerExpense = {
  document_date?: string | null;
  created_at?: string | null;
  /** Primary amount field used by expense_documents */
  total_amount?: number | string | null;
  /** Alternate names from receipts / OCR payloads */
  amount?: number | string | null;
  total?: number | string | null;
  invoice_id?: string | null;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

/**
 * Parse expense/invoice dates robustly (ISO, EU DD/MM/YYYY, DD.MM.YYYY, timestamps).
 * Returns local calendar year/month or null if unusable.
 */
export function parseLedgerDate(raw: unknown, fallback?: unknown): { year: number; month: number } | null {
  const tryOne = (value: unknown): { year: number; month: number } | null => {
    if (value == null || value === '') return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return { year: value.getFullYear(), month: value.getMonth() };
    }

    const s = String(value).trim();
    if (!s) return null;

    // Prefer explicit YYYY-MM-DD (avoid UTC midnight shifting month in western TZs)
    const isoDay = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDay) {
      const year = parseInt(isoDay[1], 10);
      const month = parseInt(isoDay[2], 10) - 1;
      const day = parseInt(isoDay[3], 10);
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        return { year, month };
      }
    }

    const normalized = normalizeReceiptDate(s);
    if (normalized) {
      const year = parseInt(normalized.slice(0, 4), 10);
      const month = parseInt(normalized.slice(5, 7), 10) - 1;
      if (Number.isFinite(year) && month >= 0 && month <= 11) {
        return { year, month };
      }
    }

    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return { year: d.getFullYear(), month: d.getMonth() };
    }

    return null;
  };

  return tryOne(raw) || tryOne(fallback);
}

/** Safe money parse: number | "17,59" | "17.59" → finite number or 0 (never NaN). */
export function parseMoneyAmount(raw: unknown): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0;
  }
  if (raw == null || raw === '') return 0;

  const s = String(raw)
    .trim()
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/[^\d,.\-]/g, '');

  if (!s || s === '-' || s === '.' || s === ',') return 0;

  // EU: 1.234,56 → 1234.56 ; plain 17,59 → 17.59
  let normalized = s;
  if (s.includes(',') && s.includes('.')) {
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    normalized = s.replace(',', '.');
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Pick first usable amount from expense/receipt-shaped rows. */
export function expenseAmount(exp: LedgerExpense): number {
  const candidates = [exp.total_amount, exp.amount, exp.total];
  for (const c of candidates) {
    if (c == null || c === '') continue;
    const n = parseMoneyAmount(c);
    if (n !== 0 || String(c).trim() === '0' || String(c).trim() === '0.0' || String(c).trim() === '0,0') {
      return Math.abs(n);
    }
    // explicitly zero
    if (parseMoneyAmount(c) === 0 && /0/.test(String(c))) return 0;
  }
  return Math.abs(parseMoneyAmount(candidates.find((c) => c != null && c !== '') ?? 0));
}

function emptyMonths(): MonthData[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: MONTH_NAMES[i],
    income: 0,
    expenses: 0,
  }));
}

/**
 * Build YTD monthly series + totals for the current calendar year.
 * ALL valid receipts/expenses count toward spent (not only invoice-linked).
 */
export function computeHomeMoney(
  invoices: Array<{
    status?: string;
    date?: string | null;
    created_at?: string | null;
    total_gross?: number | string | null;
    total?: number | string | null;
  }>,
  expenseDocuments: LedgerExpense[],
  now: Date = new Date(),
): MoneyTotals {
  const currentYear = now.getFullYear();
  const months = emptyMonths();

  for (const inv of invoices) {
    if (inv.status !== 'paid') continue;
    const d = parseLedgerDate(inv.date, inv.created_at);
    if (!d || d.year !== currentYear) continue;
    const income = parseMoneyAmount(inv.total_gross ?? inv.total);
    months[d.month].income += Math.abs(income);
  }

  for (const exp of expenseDocuments) {
    const d = parseLedgerDate(exp.document_date, exp.created_at);
    if (!d || d.year !== currentYear) continue;
    months[d.month].expenses += expenseAmount(exp);
  }

  const received = months.reduce((s, m) => s + m.income, 0);
  const spent = months.reduce((s, m) => s + m.expenses, 0);

  return {
    received,
    spent,
    profit: received - spent,
    months,
  };
}
