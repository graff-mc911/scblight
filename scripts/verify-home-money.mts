/**
 * Smoke tests for Home YTD money aggregations.
 * Run: npx tsx scripts/verify-home-money.mts
 */
import { computeHomeMoney, parseLedgerDate } from '../src/lib/homeMoney.ts';

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg);
  } else {
    console.log('OK:', msg);
  }
}

const now = new Date('2026-09-19T12:00:00');

assert(parseLedgerDate('2026-09-18')?.year === 2026, 'ISO date');
assert(parseLedgerDate('18/09/2026')?.month === 8, 'EU slash date → Sep');
assert(parseLedgerDate('18.09.2026')?.month === 8, 'EU dot date → Sep');
assert(parseLedgerDate('18/09/2026', '2020-01-01')?.year === 2026, 'primary wins');
assert(parseLedgerDate('not-a-date', '2026-09-01')?.month === 8, 'fallback created_at');
assert(parseLedgerDate('garbage') == null, 'invalid → null');

// Unattached general receipt — must NOT count toward spent/profit
const general = computeHomeMoney(
  [],
  [
    {
      document_date: '18/09/2026',
      total_amount: 17.59,
      created_at: '2026-09-18T20:00:00Z',
      invoice_id: null,
    },
  ],
  now,
);
assert(general.spent === 0, `unattached check → spent 0, got ${general.spent}`);
assert(general.profit === 0, `unattached check → profit 0, got ${general.profit}`);

const attached = computeHomeMoney(
  [],
  [
    {
      document_date: '18/09/2026',
      total_amount: 17.59,
      created_at: '2026-09-18T20:00:00Z',
      invoice_id: 'inv-1',
    },
  ],
  now,
);
assert(attached.spent === 17.59, `attached check → spent ${attached.spent}`);
assert(attached.profit === -17.59, `attached check → profit ${attached.profit}`);
assert(attached.months[8].expenses === 17.59, 'September bucket');

const isoMoney = computeHomeMoney(
  [{ status: 'paid', date: '2026-03-01', total_gross: 100 }],
  [{ document_date: '2026-09-18', total_amount: 17.59, invoice_id: 'inv-1' }],
  now,
);
assert(isoMoney.received === 100, 'paid invoice received');
assert(isoMoney.spent === 17.59, 'ISO expense spent');
assert(isoMoney.profit === 82.41, `profit 100-17.59 → ${isoMoney.profit}`);

const priorYear = computeHomeMoney(
  [],
  [{ document_date: '2025-12-01', total_amount: 50, created_at: '2025-12-01', invoice_id: 'inv-1' }],
  now,
);
assert(priorYear.spent === 0, 'prior-year expense excluded from YTD spent');

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll home money checks passed');
