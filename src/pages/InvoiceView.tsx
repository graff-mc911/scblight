import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  Trash2,
  PenTool,
  Send,
  Mail,
  ZoomIn,
  ZoomOut,
  Edit2,
  Eye,
  Receipt,
  ScanLine,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';
import { AnimatePresence } from 'framer-motion';
import ReceiptScanReview from '../components/ReceiptScanReview';
import { ScannedReceiptData } from '../lib/receiptOCR';

export const InvoiceView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showSuccess, showError } = useToastContext();

  const [invoice, setInvoice] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [scanFile, setScanFile] = useState<File | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // ==============================
  // ЗАГРУЗКА ДАНИХ
  // ==============================
  const fetchInvoice = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return;

      // Інвойс
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      setInvoice(invoiceData);

      // Витрати
      const { data: expensesData } = await supabase
        .from('expense_documents')
        .select('*')
        .eq('invoice_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setExpenses(expensesData || []);
    } catch (e) {
      showError('Помилка завантаження');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // ==============================
  // OCR → ВИТРАТА (ГОЛОВНЕ)
  // ==============================
  const handleScanConfirm = async (data: ScannedReceiptData, fileUrl: string) => {
    try {
      setScanFile(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return;

      const amount = Number(data.total || 0);

      const { error } = await supabase.from('expense_documents').insert({
        user_id: user.id,
        invoice_id: id,

        vendor_name: data.store_name || 'Receipt',
        document_number: data.receipt_number || null,
        document_date: data.date || new Date().toISOString(),

        total_amount: amount,
        amount_net: Number(data.amount_net || amount),
        vat_amount: Number(data.vat_amount || 0),
        vat_rate: Number(data.vat_rate || 0),

        currency: 'EUR',
        payment_method: data.payment_method || 'cash',
        document_type: 'receipt',
        expense_category: 'materials',

        original_file_url: fileUrl,
        notes: data.items || null,
      });

      if (error) throw error;

      showSuccess('Чек додано');
      await fetchInvoice();
    } catch (e: any) {
      showError(e.message || 'OCR помилка');
    }
  };

  // ==============================
  // ВИБІР ФАЙЛУ
  // ==============================
  const handleScanFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanFile(file);
  };

  // ==============================
  // РОЗРАХУНКИ
  // ==============================
  const total = Number(invoice?.total_gross || 0);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.total_amount || 0), 0);
  }, [expenses]);

  const profit = total - totalExpenses;

  // ==============================
  // UI
  // ==============================
  if (isLoading) {
    return <div className="text-white p-10">Loading...</div>;
  }

  if (!invoice) {
    return <div className="text-white p-10">Not found</div>;
  }

  return (
    <div className="p-6 text-white">

      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <button onClick={() => navigate('/invoices')}>
          <ArrowLeft />
        </button>

        <div className="flex gap-2">
          <button onClick={() => scanInputRef.current?.click()}>
            <ScanLine />
          </button>
        </div>
      </div>

      {/* СТАТИ */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div>Сума: {total} €</div>
        <div>Витрати: {totalExpenses} €</div>
        <div>Прибуток: {profit} €</div>
      </div>

      {/* ВИТРАТИ */}
      <div className="space-y-3">
        {expenses.map((e) => (
          <div key={e.id} className="bg-white/10 p-3 rounded">
            {e.vendor_name} — {e.total_amount} €
          </div>
        ))}
      </div>

      {/* INPUT */}
      <input
        ref={scanInputRef}
        type="file"
        onChange={handleScanFileSelect}
        className="hidden"
      />

      {/* OCR MODAL */}
      <AnimatePresence>
        {scanFile && (
          <ReceiptScanReview
            file={scanFile}
            onClose={() => setScanFile(null)}
            onConfirm={handleScanConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
};