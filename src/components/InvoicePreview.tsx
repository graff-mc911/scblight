import React, { useEffect, useMemo, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { InvoiceDocument } from './InvoiceDocument';
import { useLanguage } from '../contexts/LanguageContext';
import { generateInvoicePDFBlob } from '../lib/pdfGenerator';

interface InvoicePreviewProps {
  invoice: any;
  client?: any;
  companyProfile?: any;
  onClose?: () => void;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  client,
  companyProfile,
  onClose,
}) => {
  const { t } = useLanguage();
  const [zoom, setZoom] = useState(1);
  const [initialZoom, setInitialZoom] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const isMobile = useMemo(() => window.innerWidth < 768, []);

  useEffect(() => {
    const calc = () => {
      const width = window.innerWidth;
      const fit = Math.min((width - 24) / 794, 1);
      setInitialZoom(fit);
      setZoom(fit);
    };

    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  useEffect(() => {
    if (!onClose) return;

    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [onClose]);

  const invoiceData = {
    document_number: invoice.document_number,
    date: invoice.date,
    work_period_start: invoice.work_period_start,
    work_period_end: invoice.work_period_end,
    client_name: client?.name || invoice.client_name || '',
    client_number: invoice.client_number || client?.client_number || '',
    client_address: client?.address || invoice.client_address || '',
    client_tax_number: client?.tax_number || '',
    currency: invoice.currency,
    items: (invoice.items || []).map((i: any) => ({
      description: i.description || i.material || '',
      quantity: i.quantity,
      unit: i.unit,
      price: i.price,
      total: i.total,
    })),
    vat_enabled: invoice.vat_enabled,
    vat_rate: invoice.vat_rate,
    object_address: invoice.object_address,
    notes: invoice.notes,
    service_period_start: invoice.work_period_start,
    service_period_end: invoice.work_period_end,
    invoice_language: invoice.invoice_language,
  };

  const companyData = {
    company_name: companyProfile?.company_name,
    company_address: companyProfile?.address,
    company_phone: companyProfile?.phone,
    company_email: companyProfile?.email,
    company_tax_number: companyProfile?.tax_number,
    company_bank: companyProfile?.bank_name,
    company_iban: companyProfile?.iban,
    company_bic: companyProfile?.bic,
  };

  useEffect(() => {
    let revokedUrl: string | null = null;

    const makePdf = async () => {
      if (!isMobile) return;

      try {
        setLoadingPdf(true);
        const blob = await generateInvoicePDFBlob(
          invoiceData,
          companyData,
          companyProfile?.logo_url
        );
        const url = URL.createObjectURL(blob);
        revokedUrl = url;
        setPdfUrl(url);
      } catch (e) {
        console.error('PDF preview failed', e);
        setPdfUrl(null);
      } finally {
        setLoadingPdf(false);
      }
    };

    makePdf();

    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [isMobile, invoice, client, companyProfile]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && onClose) onClose();
  };

  const zoomIn = () => setZoom((z) => Math.min(z + 0.1, 2));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.3));
  const resetZoom = () => setZoom(initialZoom);

  if (!onClose) {
    return (
      <div className="w-full overflow-auto">
        <div className="mx-auto bg-white shadow-lg" style={{ width: '794px', minHeight: '1123px' }}>
          <InvoiceDocument data={invoiceData} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 overflow-hidden"
      onClick={handleOverlayClick}
    >
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="flex items-center justify-between bg-black/70 p-3">
          <span className="text-white text-sm sm:text-base">{t('preview')}</span>

          {!isMobile && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={zoomOut}
                className="rounded-lg bg-white/10 p-2 text-white"
              >
                <ZoomOut className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={zoomIn}
                className="rounded-lg bg-white/10 p-2 text-white"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={resetZoom}
                className="rounded-lg bg-white/10 p-2 text-white"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 p-2 text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-neutral-900">
          {isMobile ? (
            loadingPdf ? (
              <div className="flex h-full items-center justify-center text-white/70">
                {t('loading') || 'Loading...'}
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                title="Invoice PDF Preview"
                className="h-full w-full border-0 bg-white"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-white/70 px-4 text-center">
                PDF preview error
              </div>
            )
          ) : (
            <div className="flex justify-center p-4">
              <div
                style={{
                  width: `${794 * zoom}px`,
                  minHeight: `${1123 * zoom}px`,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '794px',
                    minHeight: '1123px',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <InvoiceDocument data={invoiceData} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};