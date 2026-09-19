/**
 * Safe arithmetic for on-site invoice line fields.
 * Supports + - * / ( ), decimals, and percentages:
 *   `12 + 5.5 * 2` → 23
 *   `100 - 15%`    → 85  (percent of the left operand)
 *   `200 * 10%`    → 20
 */
export function expandPercentExpressions(expression: string): string {
  let s = expression.replace(/\s+/g, '').replace(/,/g, '.');

  // A±B% → A ± (A * B / 100)
  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s.replace(
      /(\d+(?:\.\d+)?)([+-])(\d+(?:\.\d+)?)%/g,
      (_, a: string, op: string, b: string) => `${a}${op}(${a}*${b}/100)`,
    );
  }

  // Remaining N% → (N/100) e.g. 200*10%
  s = s.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
  return s;
}

export const safeEval = (expression: string): number => {
  try {
    const trimmed = String(expression ?? '').trim();
    if (!trimmed) return NaN;

    const withPercent = expandPercentExpressions(trimmed);
    const sanitized = withPercent.replace(/\s+/g, '');

    const validPattern = /^[\d+\-*/().]+$/;
    if (!validPattern.test(sanitized)) {
      return NaN;
    }

    if (/[a-zA-Z_]/.test(sanitized)) {
      return NaN;
    }

    const result = Function(`"use strict"; return (${sanitized})`)();
    return typeof result === 'number' && Number.isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
};

/** Evaluate display text; return null if empty/invalid (caller keeps previous). */
export function evalFieldExpression(display: string): number | null {
  const raw = String(display ?? '').trim();
  if (!raw) return null;
  // Plain number
  if (/^-?\d+([.,]\d+)?$/.test(raw)) {
    const n = Number(raw.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  const result = safeEval(raw);
  return Number.isFinite(result) ? result : null;
}
