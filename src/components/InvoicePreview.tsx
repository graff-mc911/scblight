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

  // --------------------------------------------------
  // Стани preview
  // --------------------------------------------------
  const [zoom, setZoom] = useState(1);
  const [initialZoom, setInitialZoom] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // --------------------------------------------------
  // Мобільний чи ні
  // --------------------------------------------------
  const isMobile = useMemo(() => window.innerWidth < 768, []);

  // --------------------------------------------------
  // Автомасштаб для desktop preview
  // --------------------------------------------------
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

  // --------------------------------------------------
  // Блокуємо скрол фону, якщо відкритий modal preview
  // --------------------------------------------------
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

  // --------------------------------------------------
  // Дані компанії
  // ВАЖЛИВО:
  // Спочатку беремо збережені поля з invoice,
  // а якщо їх нема — беремо з companyProfile
  // --------------------------------------------------
  const companyData = useMemo(() => {
    return {
      company_name:
        invoice?.executor_name ||
        companyProfile?.company_name ||
        '',

      company_address:
        invoice?.executor_address ||
        companyProfile?.address ||
        '',

      company_phone:
        invoice?.executor_phone ||
        companyProfile?.phone ||
        '',

      company_email:
        invoice?.executor_email ||
        companyProfile?.email ||
        '',

      company_tax_number:
        invoice?.executor_tax_number ||
        companyProfile?.tax_number ||
        '',

      company_bank:
        invoice?.executor_bank ||
        companyProfile?.bank_name ||
        '',

      company_iban:
        invoice?.executor_iban ||
        companyProfile?.iban ||
        '',

      company_bic:
        invoice?.executor_bic ||
        companyProfile?.bic ||
        '',
    };
  }, [invoice, companyProfile]);

  // --------------------------------------------------
  // Логотип компанії
  // --------------------------------------------------
  const companyLogoUrl = useMemo(() => {
    return invoice?.executor_logo_url || companyProfile?.logo_url || '';
  }, [invoice, companyProfile]);

  // --------------------------------------------------
  // Дані інвойсу для відображення
  // Тут також додаємо company_* поля,
  // щоб InvoiceDocument міг їх використати
  // --------------------------------------------------
  const invoiceData = useMemo(() => {
    return {
      document_number: invoice?.document_number || invoice?.document_no || '',
      date: invoice?.date || '',
      work_period_start: invoice?.work_period_start || '',
      work_period_end: invoice?.work_period_end || '',

      client_name: client?.name || invoice?.client_name || '',
      client_number: invoice?.client_number || client?.client_number || '',
      client_address: client?.address || invoice?.client_address || '',
      client_tax_number: client?.tax_number || invoice?.client_tax_number || '',
      client_email: client?.email || invoice?.client_email || '',
      client_phone: client?.phone || invoice?.client_phone || '',

      currency: invoice?.currency || 'EUR',

      items: (invoice?.items || []).map((i: any) => ({
        description: i.description || i.material || '',
        quantity: i.quantity,
        unit: i.unit,
        price: i.price,
        total: i.total,
      })),

      vat_enabled: !!invoice?.vat_enabled,
      vat_rate: invoice?.vat_rate || 0,
      vat_amount: invoice?.vat_amount || invoice?.tax_amount || 0,
      net_total: invoice?.net_total || invoice?.total_net || 0,
      gross_total: invoice?.gross_total || invoice?.total_gross || 0,

      object_address: invoice?.object_address || '',
      notes: invoice?.notes || '',

      service_period_start: invoice?.work_period_start || '',
      service_period_end: invoice?.work_period_end || '',

      invoice_language: invoice?.invoice_language || '',

      signature_data_url: invoice?.signature_data_url || '',
      signed_by: invoice?.signed_by || '',
      signed_at: invoice?.signed_at || '',

      // --------------------------------------------------
      // Додаємо компанію прямо в data
      // --------------------------------------------------
      company_name: companyData.company_name,
      company_address: companyData.company_address,
      company_phone: companyData.company_phone,
      company_email: companyData.company_email,
      company_tax_number: companyData.company_tax_number,
      company_bank: companyData.company_bank,
      company_iban: companyData.company_iban,
      company_bic: companyData.company_bic,
      company_logo_url: companyLogoUrl,
    };
  }, [invoice, client, companyData, companyLogoUrl]);

  // --------------------------------------------------
  // Генерація PDF preview на мобільному
  // --------------------------------------------------
  useEffect(() => {
    let revokedUrl: string | null = null;

    const makePdf = async () => {
      if (!isMobile) return;

      try {
        setLoadingPdf(true);

        const blob = await generateInvoicePDFBlob(
          invoiceData,
          companyData,
          companyLogoUrl
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

    void makePdf();

    return () => {
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [isMobile, invoiceData, companyData, companyLogoUrl]);

  // --------------------------------------------------
  // Закриття по кліку в overlay
  // --------------------------------------------------
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  // --------------------------------------------------
  // Zoom controls
  // --------------------------------------------------
  const zoomIn = () => setZoom((z) => Math.min(z + 0.1, 2));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.3));
  const resetZoom = () => setZoom(initialZoom);

  // --------------------------------------------------
  // Inline режим без modal
  // --------------------------------------------------
  if (!onClose) {
    return (
      <div className="w-full overflow-auto">
        <div
          className="mx-auto bg-white shadow-lg"
          style={{ width: '794px', minHeight: '1123px' }}
        >
          <InvoiceDocument data={invoiceData} />
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Modal preview
  // --------------------------------------------------
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 overflow-hidden"
      onClick={handleOverlayClick}
    >
      <div className="flex h-full w-full flex-col overflow-hidden">
        {/* Верхня панель */}
        <div className="flex items-center justify-between bg-black/70 p-3">
          <span className="text-white text-sm sm:text-base">
            {t('preview')}
          </span>

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

        {/* Контент */}
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