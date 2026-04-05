import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface ParsedInvoiceData {
  company: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: string;
  currency: string;
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push(pageText);
  }
  return pages.join('\n');
}

function parseAmount(text: string): string {
  const patterns = [
    /Gesamtbetrag[:\s€]*([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})/i,
    /Brutto(?:betrag|summe)?[:\s€]*([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})/i,
    /Rechnungsbetrag[:\s€]*([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})/i,
    /Total[:\s€]*([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})/i,
    /Gesamt[:\s€]*([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})/i,
    /Summe[:\s€]*([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})/i,
    /Endbetrag[:\s€]*([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})/i,
    /Za[hl]len Sie[:\s]*([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return normalizeAmount(match[1]);
    }
  }
  const amounts: number[] = [];
  const allAmounts = text.matchAll(/([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})\s*(?:€|EUR)/g);
  for (const m of allAmounts) {
    const val = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(val) && val > 0) amounts.push(val);
  }
  if (amounts.length > 0) {
    return String(Math.max(...amounts)).replace('.', ',');
  }
  return '';
}

function normalizeAmount(raw: string): string {
  const cleaned = raw.trim();
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      return cleaned.replace(/\./g, '').replace(',', '.');
    }
    return cleaned.replace(/,/g, '');
  }
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts[parts.length - 1].length === 2) {
      return cleaned.replace(',', '.');
    }
    return cleaned.replace(/,/g, '');
  }
  return cleaned;
}

function parseDate(text: string): string {
  const patterns = [
    /Rechnungsdatum[:\s]*(\d{2}\.\d{2}\.\d{4})/i,
    /Datum[:\s]*(\d{2}\.\d{2}\.\d{4})/i,
    /Leistungsdatum[:\s]*(\d{2}\.\d{2}\.\d{4})/i,
    /(?:vom|am)\s+(\d{2}\.\d{2}\.\d{4})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return convertDateToISO(match[1]);
  }
  const match = text.match(/(\d{2}\.\d{2}\.\d{4})/);
  if (match) return convertDateToISO(match[1]);
  return new Date().toISOString().split('T')[0];
}

function convertDateToISO(ddmmyyyy: string): string {
  const [day, month, year] = ddmmyyyy.split('.');
  return `${year}-${month}-${day}`;
}

function parseInvoiceNumber(text: string): string {
  const patterns = [
    /Rechnung(?:snummer)?[:\s#]*(RE\d+)/i,
    /Rechnung[:\s#]*([A-Z0-9\-\/]{4,20})/i,
    /Rechnungs-?Nr\.?[:\s]*([A-Z0-9\-\/]{3,20})/i,
    /Invoice\s*(?:No|Nr|Number)?\.?[:\s#]*([A-Z0-9\-\/]{3,20})/i,
    /\b(RE[-\s]?\d{4,})\b/i,
    /\b(INV[-\s]?\d{4,})\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return '';
}

function parseCompany(text: string): string {
  const patterns = [
    /^([A-ZÄÖÜ][^\n]{2,60}(?:GmbH|AG|KG|OHG|GbR|e\.K\.|mbH|UG|Ltd|BAU|Bau|Service|Dienstleistung|Handel))/m,
    /(?:Firma|Von|Absender|Lieferant)[:\s]+([^\n\r]{3,60})/i,
    /([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)\n/m,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const candidate = match[1].trim();
      if (candidate.length > 2 && candidate.length < 80) return candidate;
    }
  }
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2 && l.length < 80);
  for (const line of lines.slice(0, 10)) {
    if (/[A-ZÄÖÜ]/.test(line[0]) && !/^\d/.test(line) && !/Rechnung|Datum|Seite|Nummer/i.test(line)) {
      return line;
    }
  }
  return '';
}

export async function extractInvoiceDataFromPDF(file: File): Promise<Partial<ParsedInvoiceData>> {
  try {
    const text = await extractTextFromPDF(file);
    if (!text.trim()) return {};
    return {
      company: parseCompany(text),
      invoiceNumber: parseInvoiceNumber(text),
      invoiceDate: parseDate(text),
      totalAmount: parseAmount(text),
      currency: 'EUR',
    };
  } catch {
    return {};
  }
}
