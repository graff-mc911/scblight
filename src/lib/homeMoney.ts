/**
 * Home dashboard money aggregations.
 * Paid invoices → received.
 * Scanned/attached receipts (expense docs with invoice_id) → spent.
 * Net profit = received − spent. Chart + cards share the same YTD window.
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

function emptyMonths(): MonthData[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: MONTH_NAMES[i],
    income: 0,
    expenses: 0,
  }));
}

/** Only costs linked to an invoice/object count toward Total spent / Net profit. */
export function isAttachedExpense(exp: { invoice_id?: string | null }): boolean {
  return !!exp.invoice_id;
}

/**
 * Build YTD monthly series + totals for the current calendar year.
 * By default only expenses with `invoice_id` count toward spent (prompt §4).
 */
export function computeHomeMoney(
  invoices: Array<{
    status?: string;
    date?: string | null;
    created_at?: string | null;
    total_gross?: number | string | null;
  }>,
  expenseDocuments: Array<{
    document_date?: string | null;
    created_at?: string | null;
    total_amount?: number | string | null;
    invoice_id?: string | null;
  }>,
  now: Date = new Date(),
  options: { onlyAttached?: boolean } = { onlyAttached: true },
): MoneyTotals {
  const currentYear = now.getFullYear();
  const months = emptyMonths();
  const onlyAttached = options.onlyAttached !== false;

  for (const inv of invoices) {
    if (inv.status !== 'paid') continue;
    const d = parseLedgerDate(inv.date, inv.created_at);
    if (!d || d.year !== currentYear) continue;
    months[d.month].income += Number(inv.total_gross || 0) || 0;
  }

  for (const exp of expenseDocuments) {
    if (onlyAttached && !isAttachedExpense(exp)) continue;
    const d = parseLedgerDate(exp.document_date, exp.created_at);
    if (!d || d.year !== currentYear) continue;
    const amount = Number(exp.total_amount || 0) || 0;
    months[d.month].expenses += Math.abs(amount);
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
