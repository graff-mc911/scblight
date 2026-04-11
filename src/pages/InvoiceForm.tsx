import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Save } from 'lucide-react';
import { InvoicePreview } from '../components/InvoicePreview';
import { useLanguage } from '../contexts/LanguageContext';

export const InvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const invoice = {
    document_number: 'TEST-001',
    date: new Date().toISOString().split('T')[0],
    work_period_start: new Date().toISOString().split('T')[0],
    work_period_end: new Date().toISOString().split('T')[0],
    client_number: '',
    currency: 'EUR',
    items: [
      {
        description: 'Test item',
        quantity: 1,
        unit: 'pcs',
        price: 100,
        total: 100,
      },
    ],
    vat_enabled: false,
    vat_rate: 20,
    object_address: '',
    notes: '',
    invoice_language: language,
  };

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-4xl mx-auto text-white">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="flex items-center justify-center p-2 bg-white/10 border border-white/10 rounded-xl mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <h2 className="text-2xl font-semibold text-white mb-1">Invoice Form</h2>
        <p className="text-white/60 text-sm">Temporary restore mode</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="p-2.5 rounded-xl bg-blue-500 text-white"
        >
          <Eye className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="p-2.5 rounded-xl bg-orange-500 text-white"
        >
          <Save className="h-4 w-4" />
        </button>
      </div>

      {isPreviewOpen && (
        <InvoicePreview
          invoice={invoice}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
};