import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  Download,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Trash2,
  Upload,
  ExternalLink,
  Pencil,
  Sparkles,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { extractInvoiceDataFromPDF } from '../lib/pdfTextExtractor';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { currencies } from '../lib/languages';
import { motion, AnimatePresence } from 'framer-motion';
import { exportInvoicesToCSV } from '../lib/exportData';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { offlineStore } from '../lib/offlineStore';

const UPLOADED_INVOICES_BUCKET = 'uploaded-invoices';

type FilterStatus = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';

const normalizeAmount = (value: string): number => {
  if (!value) return 0;
  return parseFloat(value.replace(',', '.')) || 0;
};

const convertFileToPdf = async (file: File): Promise<File> => {
  if (file.type === 'application/pdf') return file;

  const imageUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = imageUrl;
  });

  const pdf = new jsPDF({
    orientation: img.width > img.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [img.width, img.height],
  });

  pdf.addImage(imageUrl, 'JPEG', 0, 0, img.width, img.height);

  const blob = pdf.output('blob');
  return new File([blob], file.name + '.pdf', { type: 'application/pdf' });
};

/* =========================
   🔥 ГОЛОВНА МОДАЛКА
   ========================= */

const UploadInvoiceModal = ({ onClose, userId, onSuccess }: any) => {
  const { showError, showSuccess } = useToastContext();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState('');
  const [issuer, setIssuer] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: any) => {
    const f = e.target.files[0];
    if (!f) return;

    try {
      const pdf = await convertFileToPdf(f);
      setFile(pdf);

      const parsed = await extractInvoiceDataFromPDF(pdf);

      if (parsed.company) setIssuer(parsed.company);
      if (parsed.totalAmount) setAmount(parsed.totalAmount);
      if (parsed.invoiceDate) setDate(parsed.invoiceDate);

    } catch {
      showError('Помилка PDF');
    }
  };

  const handleSubmit = async () => {
    if (!file) return showError('Файл');

    const parsedAmount = normalizeAmount(amount);
    if (!parsedAmount) return showError('Сума');

    setLoading(true);

    try {
      const pdf = await convertFileToPdf(file);

      const path = `${userId}/${Date.now()}_${pdf.name}`;

      await supabase.storage
        .from(UPLOADED_INVOICES_BUCKET)
        .upload(path, pdf, { upsert: true });

      const { data } = supabase.storage
        .from(UPLOADED_INVOICES_BUCKET)
        .getPublicUrl(path);

      // 🔥 ТУТ ВСЯ МАГІЯ
      await supabase.from('expense_documents').insert({
        user_id: userId,
        vendor_name: issuer,
        document_date: date,
        total_amount: parsedAmount,
        amount_net: parsedAmount,
        currency: 'EUR',
        document_type: 'supplier_invoice',
        expense_category: 'subcontractor',
        original_file_url: data.publicUrl,
      });

      showSuccess('Збережено як витрату');
      onSuccess();
      onClose();

    } catch (e: any) {
      showError(e.message);
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center">
      <div className="bg-[#1a1a1a] p-6 w-full max-w-lg space-y-4 rounded-t-3xl">

        <button onClick={() => fileRef.current?.click()}>
          {file ? file.name : 'Обери файл'}
        </button>

        <input ref={fileRef} type="file" onChange={handleFile} hidden />

        <input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Фірма" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Сума" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <button onClick={handleSubmit}>
          {loading ? '...' : 'Зберегти'}
        </button>

      </div>
    </div>
  );
};

/* =========================
   🔥 ОСНОВНА СТОРІНКА
   ========================= */

export const Invoices = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess } = useToastContext();

  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => (await supabase.auth.getSession()).data.session,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('*');
      return data || [];
    },
  });

  return (
    <div className="p-6">

      <button onClick={() => setUploadOpen(true)}>
        ЗАВАНТАЖИТИ PDF
      </button>

      {invoices.map((inv: any) => (
        <div key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}>
          {inv.client_name} — {inv.total_gross}
        </div>
      ))}

      {uploadOpen && session?.user?.id && (
        <UploadInvoiceModal
          userId={session.user.id}
          onClose={() => setUploadOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}
        />
      )}

    </div>
  );
};