/**
 * Smoke tests for inline invoice calculator expressions.
 * Run: npx tsx scripts/verify-calculator.mts
 */
import { evalFieldExpression, expandPercentExpressions, safeEval } from '../src/lib/calculator.ts';

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg);
  } else {
    console.log('OK:', msg);
  }
}

assert(safeEval('12 + 5.5 * 2') === 23, `12+5.5*2 → ${safeEval('12 + 5.5 * 2')}`);
assert(safeEval('100 - 15%') === 85, `100-15% → ${safeEval('100 - 15%')}`);
assert(safeEval('200 * 10%') === 20, `200*10% → ${safeEval('200 * 10%')}`);
assert(safeEval('100 + 10%') === 110, `100+10% → ${safeEval('100 + 10%')}`);
assert(safeEval('(3+2)*4') === 20, 'parens');
assert(Number.isNaN(safeEval('alert(1)')), 'rejects code');
assert(evalFieldExpression('12,5') === 12.5, 'EU decimal');
assert(evalFieldExpression('12 + 5.5 * 2') === 23, 'evalFieldExpression formula');
assert(expandPercentExpressions('100-15%').includes('*15/100'), 'expand percent');

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll calculator checks passed');
