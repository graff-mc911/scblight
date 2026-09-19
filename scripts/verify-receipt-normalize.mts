/**
 * Smoke tests for Spanish/EU receipt field normalization (no OpenAI call).
 * Run: npx tsx scripts/verify-receipt-normalize.mts
 */
import {
  confidenceFromFields,
  enrichFieldsFromText,
  normalizePaymentMethod,
  normalizeReceiptDateSafe,
  normalizeReceiptFields,
  parseReceiptAmount,
} from '../src/lib/receiptFieldNormalize.ts';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg);
  } else {
    console.log('OK:', msg);
  }
}

// Alicante-style receipt payload (what models often return for ES tickets)
const alicanteLike = {
  date: '18/09/2026 21:34',
  total_amount: '17,59',
  currency: 'EUR',
  merchant: '',
  store_name: 'Panadería Alicante',
  category: 'food',
  payment_method: 'TARJETA BANCARIA',
  items: 'CROISSANT: 2,50\nCAFE: 1,80',
};

const nested = {
  data: {
    vendor: 'Mercadona',
    importe_total: '12,45 €',
    fecha: '14/AGO/26',
    category: 'groceries',
    forma_pago: 'tarjeta',
  },
};

const now = new Date('2026-09-19T10:00:00Z');

assert(parseReceiptAmount('17,59') === 17.59, 'comma decimal 17,59');
assert(parseReceiptAmount('1.234,56') === 1234.56, 'EU thousands 1.234,56');
assert(parseReceiptAmount(17.59) === 17.59, 'numeric total');

const f = normalizeReceiptFields(alicanteLike, now);
assert(f.merchant === 'Panadería Alicante', `merchant alias → ${f.merchant}`);
assert(f.total === '17.59', `total EU string → ${f.total}`);
assert(f.date === '2026-09-18', `date+time → ${f.date}`);
assert(f.category === 'food', `category → ${f.category}`);
assert(f.payment_method === 'Kreditkarte', `tarjeta → ${f.payment_method}`);
assert(f.payment_explicit === true, 'payment explicit');

const conf = confidenceFromFields(f);
assert(conf >= 70, `confidence with filled fields → ${conf}`);
assert(
  confidenceFromFields({ merchant: '', total: '', date: '2026-09-18', category: 'food' }) <= 15,
  'empty merchant+total caps confidence ≤15',
);

const mercadonaText = `
MERCADONA
AV DE DENIA
FACTURA SIMPLIFICADA 1234-AB
TOTAL 17,59 €
TARJETA BANCARIA
`;
const fromText = enrichFieldsFromText(
  {
    merchant: '',
    total: '',
    date: '',
    currency: 'EUR',
    category: 'other',
    payment_method: 'Bar',
    payment_explicit: false,
    receipt_number: '',
    items: '',
  },
  mercadonaText,
);
assert(fromText.merchant === 'Mercadona', `text merchant → ${fromText.merchant}`);
assert(fromText.total === '17.59', `text TOTAL → ${fromText.total}`);
assert(fromText.payment_method === 'Kreditkarte', `text TARJETA → ${fromText.payment_method}`);
assert(fromText.payment_explicit === true, 'text payment explicit');
assert(fromText.category === 'food', `mercadona category → ${fromText.category}`);
assert(!!fromText.receipt_number, `factura number → ${fromText.receipt_number}`);

const n = normalizeReceiptFields(nested, now);
assert(n.merchant === 'Mercadona', `nested vendor → ${n.merchant}`);
assert(n.total === '12.45', `nested importe → ${n.total}`);
assert(n.date === '2026-08-14', `AGO month → ${n.date}`);
assert(n.category === 'food', `groceries alias → ${n.category}`);

// Wrong year hallucination (model returns 2023 for a Sept receipt)
assert(
  normalizeReceiptDateSafe('2023-09-18', now) === '2026-09-18',
  'repair hallucinated 2023 → current year',
);
assert(normalizeReceiptDateSafe('18/09/2026 21:34', now) === '2026-09-18', 'strip time');

assert(normalizePaymentMethod('TARJETA BANCARIA').method === 'Kreditkarte', 'ES card');
assert(normalizePaymentMethod('EFECTIVO').method === 'Bar', 'ES cash');

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll receipt normalize checks passed');
