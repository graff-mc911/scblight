import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { translations } from './languages';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

interface CompanyProfile {
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_tax_number?: string;
  company_bank?: string;
  company_iban?: string;
  company_bic?: string;
}

interface InvoiceData {
  document_number: string;
  date: string;
  client_name: string;
  client_address?: string;
  client_tax_number?: string;
  client_number?: string;
  currency: string;
  items: InvoiceItem[];
  vat_enabled: boolean;
  vat_rate: number;
  notes?: string;
  signature_data_url?: string;
  signed_by?: string;
  service_period_start?: string;
  service_period_end?: string;
  object_address?: string;
  invoice_language?: string;
}

export const generateInvoicePDF = async (
  invoice: InvoiceData,
  company: CompanyProfile,
  logoUrl?: string
): Promise<jsPDF> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const leftMargin = 20;
  const rightMargin = 20;
  const topMargin = 20;
  let currentY = topMargin;

  if (logoUrl) {
    try {
      const img = await loadImage(logoUrl);
      doc.addImage(img, 'PNG', leftMargin, currentY, 50, 25);
    } catch (error) {
      console.warn('Failed to load logo:', error);
    }
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  if (company.company_name) {
    doc.text(company.company_name, pageWidth - rightMargin, currentY, { align: 'right' });
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  currentY += 5;

  if (company.company_address) {
    const addressLines = company.company_address.split('\n');
    addressLines.forEach(line => {
      doc.text(line, pageWidth - rightMargin, currentY, { align: 'right' });
      currentY += 4;
    });
  }

  if (company.company_phone) {
    doc.text(`Tel.: ${company.company_phone}`, pageWidth - rightMargin, currentY, { align: 'right' });
    currentY += 4;
  }

  if (company.company_email) {
    doc.text(company.company_email, pageWidth - rightMargin, currentY, { align: 'right' });
  }

  currentY = Math.max(currentY, 50);
  currentY += 10;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  if (company.company_name && company.company_address) {
    const firstAddressLine = company.company_address.split('\n')[0];
    doc.text(`${company.company_name}, ${firstAddressLine}`, leftMargin, currentY);
  }

  currentY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.client_name, leftMargin, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  if (invoice.client_address) {
    const clientAddressLines = invoice.client_address.split('\n');
    clientAddressLines.forEach(line => {
      doc.text(line, leftMargin, currentY);
      currentY += 4;
    });
  }

  const metaStartY = currentY - (invoice.client_address ? invoice.client_address.split('\n').length * 4 : 0) - 5;
  doc.setFontSize(9);

  const servicePeriod = invoice.service_period_start && invoice.service_period_end
    ? `${new Date(invoice.service_period_start).toLocaleDateString('de-DE')} bis ${new Date(invoice.service_period_end).toLocaleDateString('de-DE')}`
    : new Date(invoice.date).toLocaleDateString('de-DE');

  const metaData: Array<[string, string]> = [
    ['Rechnungsnr.:', invoice.document_number],
  ];

  if (invoice.client_number) {
    metaData.push(['Kundennr.:', invoice.client_number]);
  }

  metaData.push(['Datum:', new Date(invoice.date).toLocaleDateString('de-DE')]);
  metaData.push(['Leistungszeitraum:', servicePeriod]);

  let metaCurrentY = metaStartY;
  metaData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, pageWidth - rightMargin - 60, metaCurrentY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, pageWidth - rightMargin, metaCurrentY, { align: 'right' });
    metaCurrentY += 5;
  });

  currentY = Math.max(currentY + 10, metaCurrentY + 10);

  const lang = (invoice.invoice_language || 'de') as keyof typeof translations;
  const t = translations[lang] || translations['de'];
  const tStr = (key: keyof typeof t): string => (t[key] as string) || (translations['de'][key as keyof typeof translations['de']] as string) || '';
  const tStrAny = (key: string): string => ((t as any)[key] as string) || ((translations['de'] as any)[key] as string) || '';

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${tStr('invoiceTitle')} ${invoice.document_number}`, leftMargin, currentY);
  currentY += 8;

  if (invoice.object_address) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`BVH: ${invoice.object_address}`, leftMargin, currentY);
    currentY += 8;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const salutation = `${tStr('dearClient')} ${invoice.client_name},`;
  doc.text(salutation, leftMargin, currentY);
  currentY += 8;

  const introText = tStr('thankYouText');
  const introLines = doc.splitTextToSize(introText, pageWidth - leftMargin - rightMargin);
  doc.text(introLines, leftMargin, currentY);
  currentY += (introLines.length * 5) + 5;

  const detailText = tStr('qualityText');
  const detailLines = doc.splitTextToSize(detailText, pageWidth - leftMargin - rightMargin);
  doc.text(detailLines, leftMargin, currentY);
  currentY += (detailLines.length * 5) + 10;

  const tableData = invoice.items.map((item, index) => [
    (index + 1).toString(),
    item.description,
    item.quantity.toLocaleString('de-DE'),
    item.unit,
    `${item.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `${item.total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Pos.', 'Bezeichnung', 'Menge', 'Einheit', 'Einzel €', 'Gesamt €']],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 0.5
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' }
    },
    margin: { left: leftMargin, right: rightMargin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  const netTotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = invoice.vat_enabled ? (netTotal * invoice.vat_rate) / 100 : 0;
  const grossTotal = netTotal + vatAmount;

  const totalsX = pageWidth - rightMargin - 60;
  const totalsWidth = 60;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Zwischensumme (netto)', totalsX, currentY);
  doc.text(`${netTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    totalsX + totalsWidth, currentY, { align: 'right' });
  currentY += 5;

  if (invoice.vat_enabled) {
    doc.text(`Umsatzsteuer ${invoice.vat_rate} %`, totalsX, currentY);
    doc.text(`${vatAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalsX + totalsWidth, currentY, { align: 'right' });
    currentY += 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Gesamtbetrag', totalsX, currentY);
  doc.text(`${grossTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    totalsX + totalsWidth, currentY, { align: 'right' });
  currentY += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Zahlbar sofort, rein netto', leftMargin, currentY);
  currentY += 8;

  const thankYouText = 'Vielen Dank für Ihr Vertrauen in unser Bauunternehmen. Wir freuen uns auf die weitere Zusammenarbeit';
  const thankYouLines = doc.splitTextToSize(thankYouText, pageWidth - leftMargin - rightMargin);
  doc.text(thankYouLines, leftMargin, currentY);
  currentY += (thankYouLines.length * 5) + 5;

  doc.text('Mit freundlichen Grüßen', leftMargin, currentY);
  currentY += 5;

  if (invoice.signed_by) {
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.signed_by, leftMargin, currentY);
  } else if (company.company_name) {
    const companyRepName = company.company_name.split(' ')[0];
    doc.setFont('helvetica', 'bold');
    doc.text(companyRepName, leftMargin, currentY);
  }
  currentY += 15;

  const legalY = Math.max(currentY, pageHeight - 45);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const legalText = tStrAny('legalNotice');
  const legalLines = doc.splitTextToSize(legalText, pageWidth - leftMargin - rightMargin);
  doc.text(legalLines, leftMargin, legalY);

  const footerY = pageHeight - 30;
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);

  let footerLeftY = footerY;
  if (company.company_name) {
    doc.setFont('helvetica', 'bold');
    doc.text(company.company_name, leftMargin, footerLeftY);
    footerLeftY += 3;
    doc.setFont('helvetica', 'normal');
  }
  if (company.company_address) {
    const addressLine = company.company_address.split('\n').join(', ');
    doc.text(addressLine, leftMargin, footerLeftY);
    footerLeftY += 3;
  }
  if (company.company_phone) {
    doc.text(`Tel.: ${company.company_phone}`, leftMargin, footerLeftY);
    footerLeftY += 3;
  }
  if (company.company_email) {
    doc.text(company.company_email, leftMargin, footerLeftY);
  }

  let footerCenterY = footerY;
  const centerX = pageWidth / 2;
  if (company.company_tax_number) {
    doc.text(`Steuernummer: ${company.company_tax_number}`, centerX, footerCenterY, { align: 'center' });
  }

  let footerRightY = footerY;
  const footerRightX = pageWidth - rightMargin;
  if (company.company_bank) {
    const bankName = company.company_bank.split(' ')[0];
    doc.text(`${bankName} ${company.company_bank.split(' ').slice(1).join(' ')}`, footerRightX, footerRightY, { align: 'right' });
    footerRightY += 3;
  }
  if (company.company_iban) {
    doc.text(`IBAN: ${company.company_iban}`, footerRightX, footerRightY, { align: 'right' });
    footerRightY += 3;
  }
  if (company.company_bic) {
    doc.text(`BIC: ${company.company_bic}`, footerRightX, footerRightY, { align: 'right' });
  }

  doc.setFontSize(7);
  doc.text('Seite 1/1', centerX, pageHeight - 10, { align: 'center' });

  return doc;
};

const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

export const downloadInvoicePDF = async (
  invoice: InvoiceData,
  company: CompanyProfile,
  logoUrl?: string
) => {
  const doc = await generateInvoicePDF(invoice, company, logoUrl);
  doc.save(`Rechnung_${invoice.document_number}.pdf`);
};

export const generateInvoicePDFBlob = async (
  invoice: InvoiceData,
  company: CompanyProfile,
  logoUrl?: string
): Promise<Blob> => {
  const doc = await generateInvoicePDF(invoice, company, logoUrl);
  return doc.output('blob');
};
