import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ReceiptPdfData {
  id: string;
  store_name: string;
  date: string;
  total: number;
  items: string;
  payment_method: string;
  receipt_number: string;
  file_url?: string;
  issuer_name?: string;
  issuer_address?: string;
  recipient_name?: string;
  recipient_address?: string;
  purpose?: string;
  amount_net?: number;
  vat_rate?: number;
  vat_amount?: number;
  amount_gross?: number;
  vat_enabled?: boolean;
  currency?: string;
  signature_data?: string;
}

function formatAmount(amount: number, currency = 'EUR'): string {
  const symbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', PLN: 'zł', CZK: 'Kč', UAH: '₴' };
  const sym = symbols[currency] || currency;
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + '\u00a0' + sym;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('de-DE');
}

function esc(str: string): string {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildQuittungHtml(r: ReceiptPdfData): string {
  const issuer = r.issuer_name || r.store_name || '';
  const gross = r.amount_gross || r.total || 0;
  const net = r.amount_net || 0;
  const vatAmt = r.vat_amount || 0;
  const vatRate = r.vat_rate || 0;
  const currency = r.currency || 'EUR';
  const showVat = r.vat_enabled && vatRate > 0;

  const addressBlock = (name: string, addr: string) => `
    <div style="font-size:13px;font-weight:700;color:#1e2228;margin-bottom:2px;">${esc(name)}</div>
    ${addr ? `<div style="font-size:12px;color:#666;white-space:pre-line;">${esc(addr)}</div>` : ''}
  `;

  const signatureBlock = r.signature_data ? `
    <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;">
      <div style="font-size:11px;color:#999;margin-bottom:8px;">Unterschrift Aussteller</div>
      <img src="${r.signature_data}" style="max-height:60px;max-width:220px;object-fit:contain;" />
      <div style="margin-top:4px;font-size:11px;color:#888;">${esc(issuer)}</div>
    </div>
  ` : `
    <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;">
      <div style="font-size:11px;color:#999;margin-bottom:20px;">Unterschrift Aussteller</div>
      <div style="border-bottom:1px solid #ccc;width:200px;margin-bottom:4px;"></div>
      <div style="font-size:11px;color:#888;">${esc(issuer)}</div>
    </div>
  `;

  return `
    <div id="quittung-root" style="
      width:595px;
      background:#fff;
      font-family:Arial,Helvetica,sans-serif;
      color:#1e2228;
    ">
      <div style="background:#1e2228;padding:28px 36px 22px 36px;display:flex;justify-content:space-between;align-items:flex-end;">
        <div>
          <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:1px;">QUITTUNG</div>
          ${r.receipt_number ? `<div style="font-size:13px;color:#bbb;margin-top:4px;">Nr. ${esc(r.receipt_number)}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:#bbb;">Datum</div>
          <div style="font-size:15px;font-weight:700;color:#fff;">${formatDate(r.date)}</div>
        </div>
      </div>

      <div style="padding:28px 36px;display:grid;grid-template-columns:1fr 1fr;gap:24px;border-bottom:1px solid #e5e7eb;">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;font-weight:700;">Aussteller</div>
          ${addressBlock(issuer, r.issuer_address || '')}
        </div>
        ${r.recipient_name ? `
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;font-weight:700;">Empfänger</div>
          ${addressBlock(r.recipient_name, r.recipient_address || '')}
        </div>
        ` : '<div></div>'}
      </div>

      ${r.purpose ? `
      <div style="padding:16px 36px;border-bottom:1px solid #e5e7eb;background:#f9fafb;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:6px;font-weight:700;">Verwendungszweck</div>
        <div style="font-size:13px;color:#1e2228;white-space:pre-wrap;">${esc(r.purpose)}</div>
      </div>
      ` : ''}

      ${r.items ? `
      <div style="padding:16px 36px;border-bottom:1px solid #e5e7eb;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:6px;font-weight:700;">Beschreibung</div>
        <div style="font-size:13px;color:#444;white-space:pre-wrap;line-height:1.6;">${esc(r.items)}</div>
      </div>
      ` : ''}

      <div style="padding:20px 36px;border-bottom:1px solid #e5e7eb;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:12px;font-weight:700;">Betrag</div>
        <table style="width:100%;border-collapse:collapse;">
          ${showVat ? `
          <tr>
            <td style="font-size:13px;color:#666;padding:4px 0;">Nettobetrag</td>
            <td style="font-size:13px;color:#1e2228;font-weight:600;text-align:right;padding:4px 0;">${formatAmount(net, currency)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#666;padding:4px 0;">MwSt. (${vatRate} %)</td>
            <td style="font-size:13px;color:#1e2228;font-weight:600;text-align:right;padding:4px 0;">${formatAmount(vatAmt, currency)}</td>
          </tr>
          <tr><td colspan="2"><div style="border-top:2px solid #e5e7eb;margin:8px 0;"></div></td></tr>
          ` : ''}
          <tr>
            <td style="font-size:16px;font-weight:700;color:#1e2228;padding:4px 0;">Gesamtbetrag</td>
            <td style="font-size:22px;font-weight:700;color:#e6641e;text-align:right;padding:4px 0;">${formatAmount(gross, currency)}</td>
          </tr>
        </table>

        <div style="margin-top:12px;display:flex;align-items:center;gap:8px;">
          <div style="font-size:12px;color:#666;">Zahlungsart:</div>
          <div style="font-size:12px;font-weight:700;color:#1e2228;background:#f0f0f0;padding:3px 10px;border-radius:20px;">${esc(r.payment_method || '')}</div>
        </div>
      </div>

      <div style="padding:20px 36px 32px 36px;">
        <div style="font-size:13px;color:#666;font-style:italic;">
          Hiermit wird bestätigt, dass der oben genannte Betrag von ${esc(r.recipient_name || 'dem Empfänger')} empfangen wurde.
        </div>

        ${signatureBlock}
      </div>

      <div style="background:#f9fafb;padding:10px 36px;text-align:center;">
        <div style="font-size:10px;color:#bbb;">Erstellt am ${formatDate(new Date().toISOString().split('T')[0])}</div>
      </div>
    </div>
  `;
}

function loadImageAsDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function convertImageToPDF(imageUrl: string, filename?: string): Promise<void> {
  const dataUrl = await loadImageAsDataUrl(imageUrl);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const pxPerMm = 3.7795275591;
  const pageW = 210;
  const pageH = 297;

  const fitW = pageW;
  const fitH = (imgH / imgW) * fitW;
  const orientation = fitH > pageH ? 'p' : 'p';
  const doc = new jsPDF(orientation, 'mm', 'a4');

  if (fitH <= pageH) {
    const yOffset = (pageH - fitH) / 2;
    doc.addImage(dataUrl, 'PNG', 0, yOffset, fitW, fitH);
  } else {
    let remainH = imgH;
    let yPx = 0;
    let firstPage = true;
    const pageHpx = pageH * pxPerMm;
    const pageWpx = pageW * pxPerMm;

    while (remainH > 0) {
      if (!firstPage) doc.addPage();
      firstPage = false;

      const sliceH = Math.min(remainH, (pageHpx * imgW) / pageWpx);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = imgW;
      sliceCanvas.height = sliceH;
      const ctx = sliceCanvas.getContext('2d')!;
      ctx.drawImage(img, 0, yPx, imgW, sliceH, 0, 0, imgW, sliceH);
      const sliceData = sliceCanvas.toDataURL('image/png');
      const sliceHmm = (sliceH / imgW) * pageW;
      doc.addImage(sliceData, 'PNG', 0, 0, pageW, sliceHmm);

      yPx += sliceH;
      remainH -= sliceH;
    }
  }

  const safeName = (filename || 'receipt').replace(/[^\w]/g, '_');
  doc.save(`${safeName}.pdf`);
}

export async function downloadReceiptPDF(receipt: ReceiptPdfData): Promise<void> {
  const issuer = receipt.issuer_name || receipt.store_name || 'quittung';
  const safeName = issuer.replace(/\s+/g, '_').replace(/[^\w]/g, '_');
  const date = receipt.date ? receipt.date.replaceAll('-', '') : 'nodate';
  const num = receipt.receipt_number ? `_${receipt.receipt_number.replace(/[^\w]/g, '_')}` : '';
  const baseFilename = `Quittung_${safeName}${num}_${date}`;

  const isImageAttachment = receipt.file_url && /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/i.test(receipt.file_url);

  if (isImageAttachment) {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = 210;
    const pageH = 297;

    const dataUrl = await loadImageAsDataUrl(receipt.file_url!);
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = dataUrl; });

    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const fitW = pageW;
    const fitH = (imgH / imgW) * fitW;

    if (fitH <= pageH) {
      const yOff = (pageH - fitH) / 2;
      doc.addImage(dataUrl, 'PNG', 0, yOff, fitW, fitH);
    } else {
      const pxPerMm = imgW / pageW;
      const pageHpx = pageH * pxPerMm;
      let yPx = 0;
      let first = true;
      while (yPx < imgH) {
        if (!first) doc.addPage();
        first = false;
        const sliceH = Math.min(pageHpx, imgH - yPx);
        const sc = document.createElement('canvas');
        sc.width = imgW; sc.height = sliceH;
        sc.getContext('2d')!.drawImage(img, 0, yPx, imgW, sliceH, 0, 0, imgW, sliceH);
        const sliceHmm = (sliceH / imgW) * pageW;
        doc.addImage(sc.toDataURL('image/png'), 'PNG', 0, 0, pageW, sliceHmm);
        yPx += sliceH;
      }
    }

    doc.save(`${baseFilename}.pdf`);
    return;
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-1';
  container.innerHTML = buildQuittungHtml(receipt);
  document.body.appendChild(container);

  const el = container.querySelector('#quittung-root') as HTMLElement;

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const doc = new jsPDF('p', 'mm', 'a4');
    doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    doc.save(`${baseFilename}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
