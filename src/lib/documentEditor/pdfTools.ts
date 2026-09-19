import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from 'jspdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export type CompressQuality = 'high' | 'medium' | 'low';

const QUALITY_PRESETS: Record<CompressQuality, { scale: number; jpeg: number }> = {
  high: { scale: 1.5, jpeg: 0.85 },
  medium: { scale: 1.0, jpeg: 0.65 },
  low: { scale: 0.7, jpeg: 0.45 },
};

export async function renderPdfPageToDataUrl(
  file: File,
  pageNum: number,
  scale = 2,
  jpegQuality = 0.92,
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/jpeg', jpegQuality);
}

export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

export async function compressFilesToPdf(
  files: File[],
  quality: CompressQuality,
  filename: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const preset = QUALITY_PRESETS[quality];
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  let isFirstPage = true;

  for (let fi = 0; fi < files.length; fi += 1) {
    const file = files[fi];
    onProgress?.(`Файл ${fi + 1}/${files.length}: ${file.name}`);

    if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name)) {
      const dataUrl = await fileToCompressedJpeg(file, preset.jpeg);
      const dims = await getImageDimensions(dataUrl);
      const { w, h, x, y } = fitImage(dims.width, dims.height, pageWidth, pageHeight, 10);
      if (!isFirstPage) doc.addPage();
      doc.addImage(dataUrl, 'JPEG', x, y, w, h);
      isFirstPage = false;
    } else if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      const count = await getPdfPageCount(file);
      for (let p = 1; p <= count; p += 1) {
        onProgress?.(`${file.name}: сторінка ${p}/${count}`);
        const imageData = await renderPdfPageToDataUrl(file, p, preset.scale, preset.jpeg);
        const dims = await getImageDimensions(imageData);
        const { w, h, x, y } = fitImage(dims.width, dims.height, pageWidth, pageHeight, 5);
        if (!isFirstPage) doc.addPage();
        doc.addImage(imageData, 'JPEG', x, y, w, h);
        isFirstPage = false;
      }
    }
  }

  doc.save(`${filename || 'compressed'}.pdf`);
}

async function fileToCompressedJpeg(file: File, jpegQuality: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', jpegQuality);
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function fitImage(
  iw: number,
  ih: number,
  pageW: number,
  pageH: number,
  margin: number,
): { w: number; h: number; x: number; y: number } {
  const ratio = iw / ih;
  let w = pageW - margin * 2;
  let h = w / ratio;
  if (h > pageH - margin * 2) {
    h = pageH - margin * 2;
    w = h * ratio;
  }
  return { w, h, x: (pageW - w) / 2, y: (pageH - h) / 2 };
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Розділити PDF: кожна сторінка → окремий PDF-файл */
export async function splitPdfToPages(
  file: File,
  basename: string,
  onProgress?: (msg: string) => void,
): Promise<number> {
  const count = await getPdfPageCount(file);
  const base = (basename || file.name.replace(/\.pdf$/i, '') || 'page').replace(/[^\w\u0400-\u04FF.-]+/g, '_');

  for (let p = 1; p <= count; p += 1) {
    onProgress?.(`Сторінка ${p}/${count}`);
    const imageData = await renderPdfPageToDataUrl(file, p, 1.8, 0.92);
    const dims = await getImageDimensions(imageData);
    const doc = new jsPDF({
      orientation: dims.width >= dims.height ? 'l' : 'p',
      unit: 'mm',
      format: 'a4',
    });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const { w, h, x, y } = fitImage(dims.width, dims.height, pageW, pageH, 4);
    doc.addImage(imageData, 'JPEG', x, y, w, h);
    doc.save(`${base}_p${p}.pdf`);
    if (p < count) await sleep(350);
  }
  return count;
}

/** PDF → JPG (по одній картинці на сторінку) */
export async function exportPdfPagesAsJpg(
  file: File,
  basename: string,
  onProgress?: (msg: string) => void,
): Promise<number> {
  const count = await getPdfPageCount(file);
  const base = (basename || file.name.replace(/\.pdf$/i, '') || 'page').replace(/[^\w\u0400-\u04FF.-]+/g, '_');

  for (let p = 1; p <= count; p += 1) {
    onProgress?.(`Сторінка ${p}/${count}`);
    const imageData = await renderPdfPageToDataUrl(file, p, 2, 0.92);
    downloadDataUrl(imageData, `${base}_p${p}.jpg`);
    if (p < count) await sleep(350);
  }
  return count;
}

export type RotateDegrees = 90 | 180 | 270;

/** Повернути всі сторінки PDF і завантажити новий файл */
export async function rotatePdfPages(
  file: File,
  degrees: RotateDegrees,
  filename: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const count = await getPdfPageCount(file);
  let doc: jsPDF | null = null;

  for (let p = 1; p <= count; p += 1) {
    onProgress?.(`Сторінка ${p}/${count}`);
    const imageData = await renderPdfPageToDataUrl(file, p, 1.8, 0.92);
    const rotated = await rotateDataUrl(imageData, degrees);
    const dims = await getImageDimensions(rotated);
    const landscape = dims.width >= dims.height;
    if (!doc) {
      doc = new jsPDF({ orientation: landscape ? 'l' : 'p', unit: 'mm', format: 'a4' });
    } else {
      doc.addPage('a4', landscape ? 'l' : 'p');
    }
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const { w, h, x, y } = fitImage(dims.width, dims.height, pageW, pageH, 4);
    doc.addImage(rotated, 'JPEG', x, y, w, h);
  }

  if (!doc) throw new Error('Empty PDF');
  doc.save(`${filename || 'rotated'}.pdf`);
}

function rotateDataUrl(dataUrl: string, degrees: RotateDegrees): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const rad = (degrees * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      canvas.width = Math.round(img.naturalWidth * cos + img.naturalHeight * sin);
      canvas.height = Math.round(img.naturalWidth * sin + img.naturalHeight * cos);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unavailable'));
        return;
      }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}