import React from 'react';
import { currencies, translations } from '../lib/languages';
import { useLanguage } from '../contexts/LanguageContext';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

interface InvoiceData {
  document_number: string;
  date: string;
  work_period_start?: string;
  work_period_end?: string;
  due_date?: string;
  client_name: string;
  client_number?: string;
  client_address?: string;
  client_tax_number?: string;
  currency: string;
  items: InvoiceItem[];
  vat_enabled: boolean;
  vat_rate: number;
  notes?: string;
  object_address?: string;
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_tax_number?: string;
  company_bank?: string;
  company_iban?: string;
  company_bic?: string;
  company_logo_url?: string;
  signature_data_url?: string;
  signed_by?: string;
  signed_at?: string;
}

interface InvoiceDocumentProps {
  data: InvoiceData;
  headerRef?: React.RefObject<HTMLDivElement>;
  clientRef?: React.RefObject<HTMLDivElement>;
  itemsRef?: React.RefObject<HTMLDivElement>;
  totalRef?: React.RefObject<HTMLDivElement>;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  data,
  headerRef,
  clientRef,
  itemsRef,
  totalRef
}) => {
  const { t, language } = useLanguage();
  const logoUrl = data.company_logo_url;

  const tInvoice = (key: string) => {
    const langTranslations = translations[language as keyof typeof translations];
    if (langTranslations && key in langTranslations) {
      return langTranslations[key as keyof typeof langTranslations] as string;
    }
    return translations.en[key as keyof typeof translations.en] as string || key;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const netTotal = data.items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = data.vat_enabled ? (netTotal * data.vat_rate) / 100 : 0;
  const grossTotal = netTotal + vatAmount;

  return (
    <div
      id="invoice-document"
      className="bg-white w-full mx-auto"
      style={{
        width: '210mm',
        minHeight: '297mm',
        height: 'auto',
        fontFamily: 'Arial, sans-serif',
        fontSize: '10pt',
        lineHeight: '1.4',
        color: '#000',
        padding: '20mm 20mm 15mm 20mm',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      <div ref={headerRef} style={{ marginBottom: '10mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 auto' }}>
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                style={{ height: '35mm', width: 'auto', objectFit: 'contain' }}
                crossOrigin="anonymous"
              />
            )}
          </div>
          <div style={{ textAlign: 'right', fontSize: '9pt', lineHeight: '1.6' }}>
            {data.company_name && <div style={{ fontWeight: 'bold' }}>{data.company_name}</div>}
            {data.company_address && (
              <div style={{ whiteSpace: 'pre-line' }}>{data.company_address}</div>
            )}
            {data.company_phone && <div style={{ marginTop: '2mm' }}>Tel.: {data.company_phone}</div>}
            {data.company_email && <div>{data.company_email}</div>}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '7pt', marginBottom: '3mm', textDecoration: 'underline' }}>
        {data.company_name && data.company_address && (
          <div>{data.company_name}, {data.company_address.split('\n').join(', ')}</div>
        )}
      </div>

      <div ref={clientRef} style={{ marginBottom: '10mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '10pt', lineHeight: '1.5', maxWidth: '85mm' }}>
            {data.client_address && (
              <div style={{ whiteSpace: 'pre-line' }}>{data.client_address}</div>
            )}
          </div>
          <div style={{ textAlign: 'right', fontSize: '9pt', lineHeight: '1.6' }}>
            <table style={{ borderCollapse: 'collapse', marginLeft: 'auto' }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: '8mm', textAlign: 'left' }}>{tInvoice('invoiceNumber')}:</td>
                  <td style={{ textAlign: 'right' }}>{data.document_number}</td>
                </tr>
                {data.client_number && (
                  <tr>
                    <td style={{ paddingRight: '8mm', textAlign: 'left' }}>{tInvoice('customerNumber')}:</td>
                    <td style={{ textAlign: 'right' }}>{data.client_number}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ paddingRight: '8mm', textAlign: 'left' }}>{tInvoice('date')}:</td>
                  <td style={{ textAlign: 'right' }}>{new Date(data.date).toLocaleDateString('de-DE')}</td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '8mm', textAlign: 'left' }}>{tInvoice('performancePeriod')}:</td>
                  <td style={{ textAlign: 'right' }}>
                    {data.work_period_start && data.work_period_end ? (
                      data.work_period_start === data.work_period_end ?
                        new Date(data.work_period_start).toLocaleDateString('de-DE') :
                        `${new Date(data.work_period_start).toLocaleDateString('de-DE')} - ${new Date(data.work_period_end).toLocaleDateString('de-DE')}`
                    ) : new Date(data.date).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <h1 style={{ fontSize: '16pt', fontWeight: 'normal', marginBottom: '8mm' }}>
        {tInvoice('invoiceTitle')} {data.document_number}
      </h1>

      {data.object_address && (
        <div style={{ fontSize: '10pt', marginBottom: '5mm', fontWeight: 'bold' }}>
          <div style={{ fontSize: '11pt', letterSpacing: '0.5pt' }}>{tInvoice('invoiceTitle')} {data.document_number}</div>
          <div>BVH: {data.object_address}</div>
        </div>
      )}

      <div style={{ fontSize: '10pt', lineHeight: '1.6', marginBottom: '5mm' }}>
        <p style={{ marginBottom: '3mm' }}>{tInvoice('dearClient')} {data.client_name},</p>
        <p style={{ marginBottom: '3mm' }}>
          {tInvoice('thankYouText')}
        </p>
        <p>
          {tInvoice('qualityText')}
        </p>
      </div>

      <div ref={itemsRef} style={{ marginBottom: '8mm' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', border: '1pt solid #000' }}>
          <thead>
            <tr style={{ borderBottom: '1pt solid #000' }}>
              <th style={{ textAlign: 'left', padding: '2mm', width: '10mm', border: '1pt solid #000' }}>{tInvoice('position')}</th>
              <th style={{ textAlign: 'left', padding: '2mm', border: '1pt solid #000' }}>{tInvoice('designation')}</th>
              <th style={{ textAlign: 'right', padding: '2mm', width: '15mm', border: '1pt solid #000' }}>{tInvoice('amountShort')}</th>
              <th style={{ textAlign: 'center', padding: '2mm', width: '18mm', border: '1pt solid #000' }}>{tInvoice('unit')}</th>
              <th style={{ textAlign: 'right', padding: '2mm', width: '25mm', border: '1pt solid #000' }}>{tInvoice('unitPrice')} {currencies.find(c => c.code === data.currency)?.symbol || '€'}</th>
              <th style={{ textAlign: 'right', padding: '2mm', width: '25mm', border: '1pt solid #000' }}>{tInvoice('totalPrice')} {currencies.find(c => c.code === data.currency)?.symbol || '€'}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index}>
                <td style={{ padding: '2mm', textAlign: 'left', border: '1pt solid #000' }}>{index + 1}</td>
                <td style={{ padding: '2mm', textAlign: 'left', fontWeight: 'bold', border: '1pt solid #000' }}>{item.description}</td>
                <td style={{ padding: '2mm', textAlign: 'right', border: '1pt solid #000' }}>{item.quantity}</td>
                <td style={{ padding: '2mm', textAlign: 'center', border: '1pt solid #000' }}>{item.unit}</td>
                <td style={{ padding: '2mm', textAlign: 'right', border: '1pt solid #000' }}>{formatCurrency(item.price)}</td>
                <td style={{ padding: '2mm', textAlign: 'right', border: '1pt solid #000' }}>{formatCurrency(item.total)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} style={{ padding: '2mm', textAlign: 'left', fontWeight: 'bold', border: '1pt solid #000' }}>{tInvoice('netAmount')}</td>
              <td style={{ padding: '2mm', textAlign: 'right', border: '1pt solid #000' }}>{formatCurrency(netTotal)}</td>
            </tr>
            {data.vat_enabled && (
              <tr>
                <td colSpan={5} style={{ padding: '2mm', textAlign: 'left', border: '1pt solid #000' }}>{tInvoice('vat')} {data.vat_rate} %</td>
                <td style={{ padding: '2mm', textAlign: 'right', border: '1pt solid #000' }}>{formatCurrency(vatAmount)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={5} style={{ padding: '2mm', textAlign: 'left', fontWeight: 'bold', border: '1pt solid #000' }}>{tInvoice('grossAmount')}</td>
              <td style={{ padding: '2mm', textAlign: 'right', fontWeight: 'bold', border: '1pt solid #000' }}>{formatCurrency(grossTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {data.notes && (
        <div style={{ fontSize: '9pt', marginBottom: '8mm' }}>
          <div style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>{data.notes}</div>
        </div>
      )}

      <div style={{ fontSize: '10pt', marginBottom: '5mm' }}>
        <p>{tInvoice('paymentDue')}</p>
      </div>

      <div style={{ fontSize: '10pt', lineHeight: '1.6', marginBottom: '5mm' }}>
        <p>{tInvoice('closingText')}</p>
      </div>

      <div style={{ fontSize: '10pt', lineHeight: '1.6', marginBottom: '15mm' }}>
        <p>{tInvoice('withRegards')}</p>
        {data.signed_by && (
          <div style={{ marginTop: '5mm', fontWeight: 'normal' }}>{data.signed_by}</div>
        )}
      </div>

      <div style={{ fontSize: '9pt', lineHeight: '1.4', marginBottom: '15mm', flex: '1' }}>
        <p>{tInvoice('legalNotice')}</p>
      </div>

      <div
        style={{
          borderTop: '0.5pt solid #000',
          paddingTop: '3mm',
          fontSize: '7pt',
          lineHeight: '1.5',
          color: '#000',
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ flex: '1' }}>
          {data.company_name && <div style={{ fontWeight: 'bold' }}>{data.company_name}</div>}
          {data.company_address && (
            <div style={{ whiteSpace: 'pre-line' }}>{data.company_address}</div>
          )}
          {data.company_phone && <div>Tel.: {data.company_phone}</div>}
          {data.company_email && <div>{data.company_email}</div>}
        </div>
        <div style={{ flex: '1', textAlign: 'center' }}>
          {data.company_tax_number && (
            <div>Steuernummer: {data.company_tax_number}</div>
          )}
        </div>
        <div style={{ flex: '1', textAlign: 'right' }}>
          {data.signed_by && <div>{data.signed_by}</div>}
          {data.company_bank && <div>{data.company_bank}</div>}
          {data.company_iban && <div>IBAN: {data.company_iban}</div>}
          {data.company_bic && <div>BIC: {data.company_bic}</div>}
        </div>
      </div>

      <div style={{ fontSize: '7pt', textAlign: 'center', marginTop: '3mm' }}>
        Seite 1/1
      </div>
    </div>
  );
};
