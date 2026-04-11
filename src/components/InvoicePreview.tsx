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

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  client,
  companyProfile,
  onClose,
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [initialZoom, setInitialZoom] = useState(1);

  // 🔒 блокуємо скрол всього додатку
  useEffect(() => {
    if (!onClose) return;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [onClose]);

  // 📱 fit-to-screen
  useEffect(() => {
    const calc = () => {
      const width = window.innerWidth;
      const fit = Math.min((width - 16) / A4_WIDTH, 1);
      setInitialZoom(fit);
      setZoom(fit);
    };

    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const invoiceData = {
    document_number: invoice.document_number,
    date: invoice.date,
    work_period_start: invoice.work_period_start,
    work_period_end: invoice.work_period_end,
    client_name: client?.name || invoice.client_name || '',
    client_number: invoice.client_number || '',
    currency: invoice.currency,
    items: (invoice.items || []).map((i: any) => ({
      description: i.description || i.material,
      quantity: i.quantity,
      unit: i.unit,
      price: i.price,
      total: i.total,
    })),
    vat_enabled: invoice.vat_enabled,
    vat_rate: invoice.vat_rate,
    object_address: invoice.object_address,
    notes: invoice.notes,
    company_name: companyProfile?.company_name,
    company_address: companyProfile?.address,
  };

  const handleOverlayClick = (e: any) => {
    if (e.target === e.currentTarget && onClose) onClose();
  };

  const zoomIn = () => setZoom((z) => Math.min(z + 0.1, 2));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.3));
  const resetZoom = () => setZoom(initialZoom);

  // 🧾 INLINE preview (без модалки)
  if (!onClose) {
    return (
      <div className="flex justify-center w-full max-w-full overflow-x-hidden">
        <div
          className="bg-white shadow-lg"
          style={{ width: A4_WIDTH }}
        >
          <InvoiceDocument data={invoiceData} />
        </div>
      </div>
    );
  }

  // 🔥 FULLSCREEN PREVIEW
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 overflow-hidden"
      onClick={handleOverlayClick}
    >
      <div className="flex flex-col h-full w-full overflow-hidden">

        {/* HEADER */}
        <div className="flex justify-between items-center p-3 bg-black/70">
          <span className="text-white">{t('preview')}</span>

          <div className="flex gap-2">
            <button onClick={zoomOut}><ZoomOut /></button>
            <button onClick={zoomIn}><ZoomIn /></button>
            <button onClick={resetZoom}><RotateCcw /></button>
            <button onClick={onClose}><X /></button>
          </div>
        </div>

        {/* DOCUMENT */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto"
          style={{ touchAction: 'pan-x pan-y' }}
        >
          <div className="flex justify-center w-full overflow-hidden">
            <div
              style={{
                width: A4_WIDTH * zoom,
                height: A4_HEIGHT * zoom,
              }}
            >
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  width: A4_WIDTH,
                  height: A4_HEIGHT,
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