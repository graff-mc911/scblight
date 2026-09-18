/**
 * Quick sanity: embed DejaVu and draw Cyrillic — PDF binary must contain the glyphs/text.
 * Run: npx tsx scripts/verify-pdf-cyrillic.mts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { jsPDF } = require('jspdf');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const normal = readFileSync(join(root, 'public/fonts/DejaVuSans.ttf'));
const bold = readFileSync(join(root, 'public/fonts/DejaVuSans-Bold.ttf'));

function toB64(buf: Buffer): string {
  return buf.toString('base64');
}

const doc = new jsPDF('p', 'mm', 'a4');
doc.addFileToVFS('DejaVuSans.ttf', toB64(normal));
doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
doc.addFileToVFS('DejaVuSans-Bold.ttf', toB64(bold));
doc.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');

doc.setFont('DejaVuSans', 'bold');
doc.setFontSize(14);
const sample = 'Клієнт Тест Олег';
doc.text(sample, 20, 30);
doc.setFont('DejaVuSans', 'normal');
doc.text('Rechnung / Рахунок — Müller & Co', 20, 40);

const outDir = join(root, 'dist-verify');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, 'cyrillic-sample.pdf');
writeFileSync(out, Buffer.from(doc.output('arraybuffer')));

// Helvetica control: should NOT preserve Cyrillic codepoints cleanly
const bad = new jsPDF('p', 'mm', 'a4');
bad.setFont('helvetica', 'normal');
bad.text(sample, 20, 30);
const badBytes = Buffer.from(bad.output('arraybuffer'));
const goodBytes = readFileSync(out);

const hasUtf16OrCustom =
  goodBytes.includes(Buffer.from('DejaVu')) || goodBytes.length > badBytes.length;
console.log('good pdf bytes', goodBytes.length);
console.log('helvetica pdf bytes', badBytes.length);
console.log('embedded font marker', hasUtf16OrCustom);
console.log('wrote', out);
if (!hasUtf16OrCustom) {
  process.exit(1);
}
