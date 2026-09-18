import type jsPDF from 'jspdf';

export const PDF_UNICODE_FONT = 'DejaVuSans';

let fontCache: { normal: string; bold: string } | null = null;
let loadPromise: Promise<{ normal: string; bold: string }> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadFontBase64(): Promise<{ normal: string; bold: string }> {
  if (fontCache) return fontCache;
  if (!loadPromise) {
    loadPromise = (async () => {
      const [normalRes, boldRes] = await Promise.all([
        fetch('/fonts/DejaVuSans.ttf'),
        fetch('/fonts/DejaVuSans-Bold.ttf'),
      ]);
      if (!normalRes.ok || !boldRes.ok) {
        throw new Error('Failed to load Unicode PDF fonts');
      }
      const [normalBuf, boldBuf] = await Promise.all([
        normalRes.arrayBuffer(),
        boldRes.arrayBuffer(),
      ]);
      fontCache = {
        normal: arrayBufferToBase64(normalBuf),
        bold: arrayBufferToBase64(boldBuf),
      };
      return fontCache;
    })().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

/**
 * Embed DejaVu Sans so Cyrillic / Ukrainian / German special chars render
 * correctly in jsPDF (default Helvetica is WinAnsi-only → mojibake).
 */
export async function ensurePdfUnicodeFont(doc: jsPDF): Promise<string> {
  const fonts = await loadFontBase64();
  const exists = (name: string) =>
    typeof (doc as unknown as { existsFileInVFS?: (n: string) => boolean }).existsFileInVFS ===
    'function'
      ? Boolean(
          (doc as unknown as { existsFileInVFS: (n: string) => boolean }).existsFileInVFS(name),
        )
      : false;

  if (!exists('DejaVuSans.ttf')) {
    doc.addFileToVFS('DejaVuSans.ttf', fonts.normal);
    doc.addFont('DejaVuSans.ttf', PDF_UNICODE_FONT, 'normal', 'Identity-H');
  }
  if (!exists('DejaVuSans-Bold.ttf')) {
    doc.addFileToVFS('DejaVuSans-Bold.ttf', fonts.bold);
    doc.addFont('DejaVuSans-Bold.ttf', PDF_UNICODE_FONT, 'bold', 'Identity-H');
  }
  doc.setFont(PDF_UNICODE_FONT, 'normal');
  return PDF_UNICODE_FONT;
}
