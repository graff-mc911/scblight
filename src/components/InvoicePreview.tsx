import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { InvoiceDocument } from './InvoiceDocument';
import { useLanguage } from '../contexts/LanguageContext';

interface InvoicePreviewProps {
  invoice: any;
  client?: any;
  companyProfile?: any;
  onClose?: () => void;
}

const A4_WIDTH_PX = 794;
const A4_MIN_HEIGHT_PX = 1123;

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  client,
  companyProfile,
  onClose,
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [initialZoom, setInitialZoom] = useState(1);
  const [docHeight, setDocHeight] = useState(A4_MIN_HEIGHT_PX);

  useEffect(() => {
    const calculateInitialZoom = () => {
      const viewportWidth = window.innerWidth;
      const horizontalPadding = viewportWidth < 640 ? 16 : 32;
      const availableWidth = Math.max(viewportWidth - horizontalPadding, 240);
      const fitZoom = Math.min(availableWidth / A4_WIDTH_PX, 1);

      setInitialZoom(fitZoom);
      setZoom(fitZoom);
    };

    calculateInitialZoom();
    window.addEventListener('resize', calculateInitialZoom);

    return () => window.removeEventListener('resize', calculateInitialZoom);
  }, []);

  useEffect(() => {
    if (!documentRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = Math.max(entry.contentRect.height, A4_MIN_HEIGHT_PX);
        setDocHeight(height);
      }
    });

    observer.observe(documentRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!onClose) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
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
    items: (invoice.items || []).map((item: any) => ({
      description: item.description || item.material || '',
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      total: item.total,
    })),
    vat_enabled: invoice.vat_enabled,
    vat_rate: invoice.vat_rate,
    object_address: invoice.object_address,
    notes: invoice.notes,
    company_name: companyProfile?.company_name,
    company_address: companyProfile?.address,
    company_phone: companyProfile?.phone,
    company_email: companyProfile?.email,
    company_tax_number: companyProfile?.tax_number,
    company_bank: companyProfile?.bank_name,
    company_iban: companyProfile?.iban,
    company_bic: companyProfile?.bic,
    company_logo_url: companyProfile?.logo_url,
    invoice_language: invoice.invoice_language,
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.3));
  };

  const handleResetZoom = () => {
    setZoom(initialZoom);
  };

  if (!onClose) {
    return (
      <div className="flex justify-center w-full overflow-x-auto">
        <div
          className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg"
          style={{ width: `${A4_WIDTH_PX}px` }}
        >
          <div
            ref={documentRef}
            className="bg-white"
            style={{
              width: `${A4_WIDTH_PX}px`,
              minHeight: `${A4_MIN_HEIGHT_PX}px`,
            }}
          >
            <InvoiceDocument data={invoiceData} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm overflow-hidden"
      onClick={handleOverlayClick}
    >
      <div className="h-full w-screen max-w-full flex flex-col overflow-hidden">
        <div className="flex-shrink-0 px-2 sm:px-4 pt-4 sm:pt-8 pb-2 sticky top-0 z-[100] bg-black/60 backdrop-blur-xl">
          <div className="flex justify-between items-center gap-2 rounded-xl p-2">
            <h2 className="text-base sm:text-xl font-semibold text-white truncate">
              {t('preview')}
            </h2>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="flex items-center gap-0.5 sm:gap-1 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl p-0.5 sm:p-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomOut();
                  }}
                  className="p-1.5 sm:p-2 text-white hover:bg-white/20 active:bg-white/30 rounded-lg transition-all touch-manipulation"
                  title="Зменшити"
                >
                  <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>

                <span className="px-2 sm:px-3 text-white text-xs sm:text-sm font-medium min-w-[50px] sm:min-w-[60px] text-center">
                  {Math.round(zoom * 100)}%
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomIn();
                  }}
                  className="p-1.5 sm:p-2 text-white hover:bg-white/20 active:bg-white/30 rounded-lg transition-all touch-manipulation"
                  title="Збільшити"
                >
                  <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetZoom();
                  }}
                  className="p-1.5 sm:p-2 text-white hover:bg-white/20 active:bg-white/30 rounded-lg transition-all touch-manipulation"
                  title="Скинути"
                >
                  <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onClose();
                }}
                className="p-1.5 sm:p-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 active:bg-white/30 transition-all touch-manipulation"
                title={t('close') || 'Close'}
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 overflow-auto overscroll-contain px-2 sm:px-4 pb-32"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x pan-y',
          }}
        >
          <div className="flex justify-center min-w-full">
            <div
              className="mx-auto bg-white rounded-none sm:rounded-lg shadow-2xl overflow-hidden"
              style={{
                width: `${A4_WIDTH_PX * zoom}px`,
                minHeight: `${docHeight * zoom}px`,
              }}
            >
              <div
                ref={documentRef}
                style={{
                  width: `${A4_WIDTH_PX}px`,
                  minHeight: `${Math.max(docHeight, A4_MIN_HEIGHT_PX)}px`,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                <InvoiceDocument data={invoiceData} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};