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

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  client,
  companyProfile,
  onClose,
}) => {
  const { t } = useLanguage();
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const [initialZoom, setInitialZoom] = useState(1);
  const [docHeight, setDocHeight] = useState(1122);

  useEffect(() => {
    const calculateInitialZoom = () => {
      if (!containerRef.current) return;

     const [docHeight, setDocHeight] = useState(1122);
     const isMobile = window.innerWidth < 640;

      if (isMobile) {
        const containerWidth = containerRef.current.offsetWidth;
        const a4WidthMm = 210;
        const mmToPx = 3.7795275591;
        const a4WidthPx = a4WidthMm * mmToPx;
        const fitZoom = containerWidth / a4WidthPx;

        setInitialZoom(fitZoom);
        setZoom(fitZoom);
      } else {
        const containerWidth = containerRef.current.offsetWidth;
        const a4WidthMm = 210;
        const mmToPx = 3.7795275591;
        const a4WidthPx = a4WidthMm * mmToPx;
        const padding = 16;
        const availableWidth = containerWidth - padding;
        const calculatedZoom = availableWidth / a4WidthPx;
        const fitZoom = Math.min(calculatedZoom, 1);

        setInitialZoom(fitZoom);
        setZoom(fitZoom);
      }
    };

    calculateInitialZoom();
    window.addEventListener('resize', calculateInitialZoom);

    return () => window.removeEventListener('resize', calculateInitialZoom);
  }, []);

  useEffect(() => {
    if (!documentRef.current || onClose) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDocHeight(entry.contentRect.height);
      }
    });
    observer.observe(documentRef.current);
    return () => observer.disconnect();
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
    items: invoice.items.map((item: any) => ({
      description: item.description || item.material,
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
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.3));
  };

  const handleResetZoom = () => {
    setZoom(initialZoom);
  };

  if (!onClose) {
    return (
      <div className="flex justify-center">
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg" style={{ width: '794px' }}>
          <div
            ref={documentRef}
            className="bg-white"
            style={{ width: '794px', minHeight: '1123px' }}
          >
            <InvoiceDocument data={invoiceData} />
          </div>
        </div>
      </div>
    );
  }

  return (
  <div
    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-auto"
    onClick={handleOverlayClick}
    style={{
      WebkitOverflowScrolling: 'touch',
      overscrollBehavior: 'contain'
    }}
  >
    <div className="h-full flex flex-col">
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
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto px-2 sm:px-4 pb-32">
        <div className="flex justify-center min-w-full">
          <div
            style={{
              width: `${zoom * 794}px`,
              minHeight: `${docHeight * zoom}px`
            }}
          >
            <div
              ref={documentRef}
              className="bg-white rounded-none sm:rounded-lg shadow-2xl transition-transform duration-200"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: '794px',
                minHeight: '1123px'
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