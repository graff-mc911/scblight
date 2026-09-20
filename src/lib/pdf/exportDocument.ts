import jsPDF from 'jspdf';
import type { OpenDocument, OverlayField } from '../../store/usePdfStore';
import { PAGE_H, PAGE_W } from './pageEngine';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Export open document (pages + overlays) to a downloadable PDF */
export async function exportDocumentToPdf(doc: OpenDocument, filename?: string): Promise<void> {
  if (!doc.pages.length) throw new Error('empty_document');

  let pdf: jsPDF | null = null;

  for (let i = 0; i < doc.pages.length; i += 1) {
    const page = doc.pages[i];
    const rot = ((page.rotation % 360) + 360) % 360;
    const landscape = page.width > page.height || rot === 90 || rot === 270;
    if (!pdf) {
      pdf = new jsPDF({
        orientation: landscape ? 'l' : 'p',
        unit: 'pt',
        format: [page.width || PAGE_W, page.height || PAGE_H],
      });
    } else {
      pdf.addPage([page.width || PAGE_W, page.height || PAGE_H], landscape ? 'l' : 'p');
    }

    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();

    if (page.dataUrl) {
      const img = await loadImage(page.dataUrl);
      pdf.addImage(img, 'PNG', 0, 0, pw, ph);
    } else {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pw, ph, 'F');
    }

    const pageFields = doc.fields.filter((f) => f.page === i);
    for (const field of pageFields) {
      await drawField(pdf, field, pw, ph);
    }
  }

  if (!pdf) throw new Error('empty_document');
  pdf.save(`${(filename || doc.name || 'document').replace(/\.pdf$/i, '')}.pdf`);
}

async function drawField(pdf: jsPDF, field: OverlayField, pw: number, ph: number) {
  const x = (field.x / 100) * pw;
  const y = (field.y / 100) * ph;
  const w = (field.w / 100) * pw;
  const h = (field.h / 100) * ph;

  if ((field.type === 'signature' || field.type === 'image' || field.type === 'initials') && field.value?.startsWith('data:')) {
    try {
      const img = await loadImage(field.value);
      pdf.addImage(img, 'PNG', x, y, w, h);
      return;
    } catch {
      /* fall through to text */
    }
  }

  if (field.type === 'checkbox') {
    pdf.setDrawColor(30, 41, 59);
    pdf.rect(x, y, Math.min(w, h), Math.min(w, h));
    if (field.checked) {
      pdf.setFontSize(14);
      pdf.text('✓', x + 2, y + Math.min(w, h) - 2);
    }
    return;
  }

  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(Math.max(8, Math.min(18, h * 0.6)));
  const label =
    field.value ||
    (field.type === 'date' ? new Date().toLocaleDateString() : field.type);
  pdf.text(String(label), x + 2, y + h * 0.7, { maxWidth: w - 4 });
}

/** Merge several documents into one OpenDocument-like page list */
export function mergePageLists(docs: OpenDocument[]): { dataUrl: string; width: number; height: number; rotation: number }[] {
  return docs.flatMap((d) =>
    d.pages.map((p) => ({
      dataUrl: p.dataUrl,
      width: p.width,
      height: p.height,
      rotation: p.rotation,
    })),
  );
}
