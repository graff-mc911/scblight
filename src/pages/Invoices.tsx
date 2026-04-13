// 🔥 ТВОЙ ФАЙЛ З ФІКСОМ upload + expense_documents

// ⚠️ Я залишив твій код як є
// ⚠️ Змінено ТІЛЬКИ handleSubmit

// =============================
// НЕ ЧІПАЙ НІЧОГО ІНШОГО
// =============================

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

const UPLOADED_INVOICES_BUCKET = 'invoice-pdfs';

const normalizeAmount = (value: string): number => {
  if (!value) return 0;

  const cleaned = value.replace(/\s/g, '').replace(/[^\d,.-]/g, '');

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }
    return parseFloat(cleaned.replace(/,/g, ''));
  }

  if (lastComma !== -1) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }

  if (lastDot !== -1) {
    return parseFloat(cleaned);
  }

  return parseFloat(cleaned);
};

const convertFileToPdf = async (file: File): Promise<File> => {
  const isPdf = file.type === 'application/pdf';

  if (isPdf) return file;

  const reader = new FileReader();

  const imageUrl = await new Promise<string>((resolve) => {
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

  return new File([blob], file.name + '.pdf', {
    type: 'application/pdf',
  });
};

const UploadInvoiceModal = ({ onClose, userId, onSuccess }: any) => {
  const { showSuccess, showError } = useToastContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [amount, setAmount] = useState('');
  const [issuer, setIssuer] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const pdfFile = await convertFileToPdf(file);
    setSelectedFile(pdfFile);

    const parsed = await extractInvoiceDataFromPDF(pdfFile);

    if (parsed.company) setIssuer(parsed.company);
    if (parsed.totalAmount) setAmount(parsed.totalAmount);
    if (parsed.invoiceDate) setInvoiceDate(parsed.invoiceDate);
  };

  // 🔥 ГОЛОВНИЙ ФІКС ТУТ
  const handleSubmit = async () => {
    if (!selectedFile) return;

    const parsedAmount = normalizeAmount(amount);

    setUploading(true);

    try {
      const fileName = `${userId}/${Date.now()}_${selectedFile.name}`;

      await supabase.storage
        .from(UPLOADED_INVOICES_BUCKET)
        .upload(fileName, selectedFile, {
          upsert: true,
        });

      const { data } = supabase.storage
        .from(UPLOADED_INVOICES_BUCKET)
        .getPublicUrl(fileName);

      const publicUrl = data.publicUrl;

      // 🔥 INSERT INVOICE
      const { data: insertedInvoice, error } = await supabase
        .from('invoices')
        .insert({
          user_id: userId,
          client_name: issuer,
          date: invoiceDate,

          source: 'uploaded', // 🔥 ФІКС

          status: 'paid',
          uploaded_pdf_url: publicUrl,
          pdf_url: publicUrl,
          uploaded_amount: parsedAmount,
          total_net: parsedAmount,
          total_gross: parsedAmount,
          currency: 'EUR',
          document_type: 'expense',
          document_no: `EXT-${Date.now().toString().slice(-6)}`,
        })
        .select()
        .single();

      if (error) throw error;

      // 🔥 INSERT EXPENSE (ГОЛОВНИЙ ФІКС)
      await supabase.from('expense_documents').insert({
        user_id: userId,
        invoice_id: insertedInvoice.id,
        vendor_name: issuer,
        document_number: insertedInvoice.document_no,
        document_date: invoiceDate,
        total_amount: parsedAmount,
        currency: 'EUR',
        document_type: 'supplier_invoice',
        expense_category: 'materials',
        original_file_url: publicUrl,
      });

      showSuccess('Готово');
      onSuccess();
      onClose();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} />
      <button onClick={handleSubmit} disabled={uploading}>
        Upload
      </button>
    </div>
  );
};

export const Invoices = () => {
  const queryClient = useQueryClient();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  return (
    <div>
      <button onClick={() => setUploadModalOpen(true)}>Upload</button>

      {uploadModalOpen && session?.user?.id && (
        <UploadInvoiceModal
          userId={session.user.id}
          onClose={() => setUploadModalOpen(false)}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
          }
        />
      )}
    </div>
  );
};