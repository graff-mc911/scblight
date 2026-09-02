import jsPDF from 'jspdf';
import type { ContentBlock, UniversalDocument } from './types';
import { blocksToPlainText } from './utils';

function addBlocksToPdf(doc: jsPDF, blocks: ContentBlock[], startY: number, margin: number, maxW: number): number {
  let y = startY;
  const pageH = doc.internal.pageSize.getHeight();

  for (const block of blocks) {
    if (y > pageH - 30) {
      doc.addPage();
      y = margin;
    }

    if (block.type === 'text') {
      const text = blocksToPlainText([block]);
      const lines = doc.splitTextToSize(text, maxW);
      for (const line of lines) {
        if (y > pageH - 20) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 6;
      }
      y += 4;
    } else if (block.type === 'image' && block.src.startsWith('data:')) {
      try {
        const format = block.src.includes('png') ? 'PNG' : 'JPEG';
        const w = Math.min(maxW, block.width || maxW);
        doc.addImage(block.src, format, margin, y, w, w * 0.6);
        y += w * 0.6 + 10;
      } catch {
        y += 10;
      }
    } else if (block.type === 'table') {
      const colW = maxW / (block.rows[0]?.length || 1);
      for (const row of block.rows) {
        if (y > pageH - 20) {
          doc.addPage();
          y = margin;
        }
        let x = margin;
        for (const cell of row) {
          doc.rect(x, y - 4, colW, 8);
          doc.text(String(cell).slice(0, 20), x + 2, y);
          x += colW;
        }
        y += 10;
      }
      y += 4;
    } else if (block.type === 'attachment') {
      doc.text(`📎 ${block.name}`, margin, y);
      y += 8;
    } else if (block.type === 'divider') {
      doc.line(margin, y, margin + maxW, y);
      y += 10;
    }
  }
  return y;
}

export async function exportDocumentPdf(doc: UniversalDocument): Promise<void> {
  const isLandscape = doc.mode === 'presentation';
  const pdf = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');
  const margin = 15;
  const pageW = pdf.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;
  let y = margin;

  pdf.setFontSize(16);
  pdf.text(doc.name, margin, y);
  y += 12;

  if (doc.mode === 'document' && doc.sections) {
    for (const section of doc.sections) {
      pdf.setFontSize(14);
      if (y > pdf.internal.pageSize.getHeight() - 30) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(section.title, margin, y);
      y += 10;
      pdf.setFontSize(11);
      y = addBlocksToPdf(pdf, section.blocks, y, margin, maxW);
      y += 8;
    }
  } else if (doc.mode === 'presentation' && doc.slides) {
    doc.slides.forEach((slide, idx) => {
      if (idx > 0) pdf.addPage();
      y = margin;
      pdf.setFontSize(18);
      pdf.text(slide.title, margin, y);
      y += 14;
      pdf.setFontSize(12);
      addBlocksToPdf(pdf, slide.blocks, y, margin, maxW);
    });
  } else if (doc.mode === 'book') {
    if (doc.cover) {
      pdf.setFontSize(22);
      pdf.text(doc.cover.title, margin, y + 20);
      pdf.setFontSize(14);
      pdf.text(doc.cover.author, margin, y + 35);
      pdf.addPage();
      y = margin;
    }
    pdf.setFontSize(14);
    pdf.text('Зміст', margin, y);
    y += 10;
    (doc.chapters || []).forEach((ch, i) => {
      pdf.setFontSize(11);
      pdf.text(`${i + 1}. ${ch.title}`, margin + 5, y);
      y += 7;
    });
    for (const chapter of doc.chapters || []) {
      pdf.addPage();
      y = margin;
      pdf.setFontSize(16);
      pdf.text(chapter.title, margin, y);
      y += 12;
      pdf.setFontSize(11);
      y = addBlocksToPdf(pdf, chapter.blocks, y, margin, maxW);
    }
  }

  pdf.save(`${doc.name.replace(/[^\w\u0400-\u04FF.-]+/g, '_')}.pdf`);
}