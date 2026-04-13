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

/**
 * Назва bucket у Supabase Storage для завантажених зовнішніх PDF.
 */
const UPLOADED_INVOICES_BUCKET = 'uploaded-invoices';

/**
 * Тип пропсів для модалки завантаження зовнішнього рахунку.
 */
interface UploadInvoiceModalProps {
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

/**
 * Тип пропсів для модалки редагування завантаженого рахунку.
 */
interface EditUploadedInvoiceModalProps {
  invoice: Record<string, any>;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Фільтр по статусах рахунків.
 */
type FilterStatus = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';

/**
 * Маленька мініатюра звичайного рахунку в списку.
 */
const InvoiceThumbnail: React.FC<{ invoice: Record<string, unknown> }> = () => {
  return (
    <div className="w-12 h-14 rounded-lg bg-white/10 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
      <div className="w-full h-full p-1 flex flex-col gap-0.5 justify-center">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`h-px rounded-full ${
              i === 1 ? 'bg-white/40 w-3/4' : i === 2 ? 'bg-white/20 w-full' : 'bg-white/15 w-full'
            }`}
          />
        ))}
        <div className="h-2 mt-0.5 bg-white/5 rounded-sm w-full" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-px bg-white/10 rounded-full w-full" />
        ))}
      </div>
    </div>
  );
};

/**
 * Бейдж статусу для звичайних рахунків.
 */
const StatusBadge: React.FC<{ status: string; t: (key: string) => string }> = ({ status, t }) => {
  if (status === 'paid') {
    return (
      <span className="flex items-center gap-1 text-xs text-white/50">
        <CheckCircle size={12} className="text-white/40" />
        {t('paid')}
      </span>
    );
  }

  if (status === 'sent') {
    return (
      <span className="flex items-center gap-1 text-xs text-blue-400/80">
        <Send size={12} />
        {t('sent')}
      </span>
    );
  }

  if (status === 'overdue') {
    return (
      <span className="flex items-center gap-1 text-xs text-red-400/80">
        <AlertCircle size={12} />
        {t('overdue')}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs text-white/40">
      <Clock size={12} />
      {t(status) || t('draft')}
    </span>
  );
};

/**
 * Якщо користувач вибрав фото, перетворюємо його у PDF.
 * Якщо файл уже PDF — повертаємо як є.
 */
const convertFileToPdf = async (file: File): Promise<File> => {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

  if (isPdf) {
    return file;
  }

  const isImage = file.type.startsWith('image/');
  if (!isImage) {
    throw new Error('Підтримуються тільки PDF або зображення');
  }

  // Зчитуємо картинку як base64/data URL
  const imageUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Створюємо HTMLImageElement для визначення розмірів
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageUrl;
  });

  // Створюємо PDF розміром під оригінальне зображення
  const pdf = new jsPDF({
    orientation: img.width > img.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [img.width, img.height],
  });

  const imageFormat = file.type.includes('png') ? 'PNG' : 'JPEG';
  pdf.addImage(imageUrl, imageFormat, 0, 0, img.width, img.height);

  const blob = pdf.output('blob');
  const safeName = file.name.replace(/\.[^.]+$/, '');

  return new File([blob], `${safeName}.pdf`, {
    type: 'application/pdf',
  });
};

/**
 * Модалка для завантаження зовнішнього рахунку.
 * Дає можливість:
 * - вибрати PDF або фото
 * - автоматично спробувати розпізнати фірму, суму, дату
 * - завантажити PDF у storage
 * - записати дані в таблицю invoices
 */
const UploadInvoiceModal: React.FC<UploadInvoiceModalProps> = ({ onClose, userId, onSuccess }) => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToastContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Вибраний файл
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Поля, які можна підтягнути автоматично з PDF
  const [amount, setAmount] = useState('');
  const [issuer, setIssuer] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  // Стани завантаження та аналізу
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);

  // Які поля були успішно розпізнані автоматично
  const [parsedFields, setParsedFields] = useState<{
    company?: boolean;
    amount?: boolean;
    date?: boolean;
  }>({});

  /**
   * Обробка вибору файлу:
   * - перевірка розміру
   * - перетворення фото в PDF
   * - OCR/парсинг PDF
   * - заповнення форми
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    if (rawFile.size > 20 * 1024 * 1024) {
      showError('Файл занадто великий (макс. 20 МБ)');
      return;
    }

    setParsing(true);
    setParsedFields({});

    try {
      const pdfFile = await convertFileToPdf(rawFile);
      setSelectedFile(pdfFile);

      // Пробуємо витягнути дані з PDF
      const parsed = await extractInvoiceDataFromPDF(pdfFile);

      const detected: { company?: boolean; amount?: boolean; date?: boolean } = {};

      // Якщо знайдено компанію — підставляємо її
      if (parsed.company) {
        setIssuer(parsed.company);
        detected.company = true;
      } else {
        // Якщо не знайдено — беремо назву файлу як запасний варіант
        const cleanName = pdfFile.name.replace(/\.pdf$/i, '').replace(/[_]/g, ' ').trim();
        setIssuer(cleanName);
      }

      // Якщо знайдена сума — підставляємо її
      if (parsed.totalAmount) {
        setAmount(parsed.totalAmount.replace('.', ','));
        detected.amount = true;
      }

      // Якщо знайдена дата — підставляємо її
      if (parsed.invoiceDate) {
        setInvoiceDate(parsed.invoiceDate);
        detected.date = true;
      }

      setParsedFields(detected);
    } catch (error: any) {
      console.error('PARSE ERROR:', error);

      // Якщо парсинг впав, хоча б підставляємо назву файлу
      const cleanName = rawFile.name.replace(/\.[^.]+$/i, '').replace(/[_]/g, ' ').trim();
      setIssuer(cleanName);

      showError(error?.message || 'Не вдалося повністю обробити файл');
    } finally {
      setParsing(false);
    }
  };

  /**
   * Фінальне завантаження:
   * 1. Файл летить у Supabase Storage
   * 2. Створюється public URL
   * 3. У таблицю invoices записується новий документ
   */
  const handleSubmit = async () => {
    if (!selectedFile) {
      showError(t('selectFile') || 'Будь ласка, оберіть файл');
      return;
    }

    const parsedAmountCheck = amount.trim() ? parseFloat(amount.trim().replace(',', '.')) : 0;

    if (isNaN(parsedAmountCheck) || parsedAmountCheck <= 0) {
      showError(t('enterAmount') || 'Введіть коректну суму');
      return;
    }

    setUploading(true);

    try {
      // Додатково гарантуємо, що файл саме PDF
      const pdfFile = await convertFileToPdf(selectedFile);

      // Очищаємо назву файлу від небажаних символів
      const safeFileName = pdfFile.name.replace(/[^\w.-]/g, '_').replace(/_+/g, '_');

      // Унікальний шлях файлу в storage
      const fileName = `${userId}/${Date.now()}_${safeFileName}`;

      console.log('USER ID:', userId);
      console.log('PDF FILE:', pdfFile);
      console.log('FILE NAME:', fileName);
      console.log('FILE TYPE:', pdfFile.type);
      console.log('FILE SIZE:', pdfFile.size);
      console.log('BUCKET:', UPLOADED_INVOICES_BUCKET);

      // 1. Завантаження PDF у storage bucket
      const { error: uploadError } = await supabase.storage
        .from(UPLOADED_INVOICES_BUCKET)
        .upload(fileName, pdfFile, {
          upsert: true,
          contentType: 'application/pdf',
        });

      if (uploadError) {
        console.error('STORAGE ERROR:', uploadError);
        throw new Error(uploadError.message || 'Помилка Storage при завантаженні PDF');
      }

      // 2. Отримуємо публічне посилання на файл
      const {
        data: { publicUrl },
      } = supabase.storage.from(UPLOADED_INVOICES_BUCKET).getPublicUrl(fileName);

      if (!publicUrl) {
        throw new Error('Не вдалося отримати publicUrl PDF');
      }

      console.log('PUBLIC URL:', publicUrl);

      // 3. Формуємо payload для таблиці invoices
      const parsedAmount = parsedAmountCheck;

      const payload = {
        user_id: userId,
        client_name: issuer || pdfFile.name.replace(/\.pdf$/i, ''),
        date: invoiceDate,
        status: 'paid',
        source: 'uploaded',
        uploaded_pdf_url: publicUrl,
        pdf_url: publicUrl,
        uploaded_amount: parsedAmount,
        total_net: parsedAmount,
        total_gross: parsedAmount,
        currency: 'EUR',
        document_type: 'expense',
        document_no: `EXT-${Date.now().toString().slice(-6)}`,
      };

      console.log('INVOICE PAYLOAD:', payload);

      // 4. Записуємо рахунок у таблицю invoices
      const { error: dbError } = await supabase.from('invoices').insert(payload);

      if (dbError) {
        console.error('DB ERROR:', dbError);
        throw new Error(dbError.message || 'Помилка запису в таблицю invoices');
      }

      showSuccess(t('invoiceUploaded') || 'Рахунок завантажено');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('UPLOAD MODAL ERROR:', err);
      showError(err?.message || 'Помилка завантаження');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-lg bg-[#1a1a1a] border border-white/10 rounded-t-3xl p-6 pb-10 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-base">
            {t('uploadExternalInvoice') || 'Завантажити чужий рахунок'}
          </h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Кнопка вибору файлу */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`w-full flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed transition-all ${
            selectedFile
              ? 'border-teal-500/50 bg-teal-500/5'
              : 'border-white/15 bg-white/3 hover:border-white/25 hover:bg-white/5'
          }`}
        >
          {selectedFile ? (
            <>
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                {parsing ? (
                  <Clock size={20} className="text-teal-400 animate-spin" />
                ) : (
                  <FileText size={20} className="text-teal-400" />
                )}
              </div>

              <p className="text-teal-300 text-sm font-medium text-center truncate max-w-full px-2">
                {selectedFile.name}
              </p>

              {parsing ? (
                <p className="text-teal-400/60 text-xs flex items-center gap-1.5">
                  <Sparkles size={11} />
                  {t('analyzingPDF') || 'Аналіз PDF...'}
                </p>
              ) : (
                <p className="text-white/30 text-xs">{(selectedFile.size / 1024).toFixed(0)} KB</p>
              )}
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center">
                <Upload size={20} className="text-white/50" />
              </div>
              <p className="text-white/60 text-sm">
                {t('selectPdfFile') || 'Оберіть PDF або фото документа'}
              </p>
              <p className="text-white/25 text-xs">PDF або фото до 20 МБ</p>
            </>
          )}
        </button>

        {/* Прихований input для вибору файлу */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Показуємо, які поля були визначені автоматично */}
        {Object.keys(parsedFields).length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <Sparkles size={12} className="text-teal-400 flex-shrink-0" />
            <p className="text-teal-400/80 text-xs">
              {t('autoDetected') || 'Автоматично розпізнано'}:
              {parsedFields.company && (
                <span className="ml-1 px-1.5 py-0.5 bg-teal-500/15 rounded text-teal-300">
                  {t('company') || 'фірма'}
                </span>
              )}
              {parsedFields.amount && (
                <span className="ml-1 px-1.5 py-0.5 bg-teal-500/15 rounded text-teal-300">
                  {t('amount') || 'сума'}
                </span>
              )}
              {parsedFields.date && (
                <span className="ml-1 px-1.5 py-0.5 bg-teal-500/15 rounded text-teal-300">
                  {t('date') || 'дата'}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Поля форми */}
        <div className="space-y-3">
          <div
            className={`bg-white/5 border rounded-xl px-4 py-3 transition-colors ${
              parsedFields.company ? 'border-teal-500/30' : 'border-white/8'
            }`}
          >
            <p className="text-white/35 text-[11px] uppercase tracking-wider mb-1">
              {t('issuerName') || 'Назва / Фірма'}
            </p>
            <input
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder={t('issuerPlaceholder') || 'Назва компанії або постачальника'}
              className="w-full bg-transparent text-white text-sm outline-none placeholder-white/20"
            />
          </div>

          <div className="flex gap-3">
            <div
              className={`flex-1 bg-white/5 border rounded-xl px-4 py-3 transition-colors ${
                parsedFields.amount ? 'border-teal-500/30' : 'border-white/8'
              }`}
            >
              <p className="text-white/35 text-[11px] uppercase tracking-wider mb-1">
                {t('amount') || 'Сума'}
              </p>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-white text-sm outline-none placeholder-white/20"
              />
            </div>

            <div
              className={`flex-1 bg-white/5 border rounded-xl px-4 py-3 transition-colors ${
                parsedFields.date ? 'border-teal-500/30' : 'border-white/8'
              }`}
            >
              <p className="text-white/35 text-[11px] uppercase tracking-wider mb-1">
                {t('date') || 'Дата'}
              </p>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-transparent text-white text-sm outline-none"
              />
            </div>
          </div>
        </div>

        {/* Кнопка підтвердження завантаження */}
        <button
          onClick={handleSubmit}
          disabled={uploading || !selectedFile || parsing}
          className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Clock size={16} className="animate-spin" />
              {t('uploading') || 'Завантаження...'}
            </>
          ) : (
            <>
              <Upload size={16} />
              {t('uploadInvoice') || 'Завантажити рахунок'}
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};

/**
 * Модалка редагування вже завантаженого зовнішнього рахунку.
 */
const EditUploadedInvoiceModal: React.FC<EditUploadedInvoiceModalProps> = ({
  invoice,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToastContext();

  // Початкові значення підтягуємо з invoice
  const [issuer, setIssuer] = useState((invoice.client_name as string) || '');
  const [amount, setAmount] = useState(
    invoice.uploaded_amount != null
      ? String(invoice.uploaded_amount).replace('.', ',')
      : invoice.total_gross != null
      ? String(invoice.total_gross).replace('.', ',')
      : ''
  );
  const [invoiceDate, setInvoiceDate] = useState(
    invoice.date ? String(invoice.date).split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [saving, setSaving] = useState(false);

  /**
   * Зберігає змінені поля в таблицю invoices.
   */
  const handleSave = async () => {
    const parsedAmount = amount.trim() ? parseFloat(amount.trim().replace(',', '.')) : 0;

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showError(t('enterAmount') || 'Введіть коректну суму');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          client_name: issuer.trim() || (invoice.client_name as string),
          uploaded_amount: parsedAmount,
          total_net: parsedAmount,
          total_gross: parsedAmount,
          date: invoiceDate,
        })
        .eq('id', invoice.id as string);

      if (error) throw error;

      showSuccess(t('saved') || 'Збережено');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('EDIT INVOICE ERROR:', error);
      showError(t('saveFailed') || 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-lg bg-[#1a1a1a] border border-white/10 rounded-t-3xl p-6 pb-10 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-base">
            {t('editExternalInvoice') || 'Редагувати рахунок'}
          </h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <FileText size={16} className="text-teal-400 flex-shrink-0" />
          <span className="text-white/50 text-sm truncate">{String(invoice.document_no || '')}</span>
        </div>

        <div className="space-y-3">
          <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3">
            <p className="text-white/35 text-[11px] uppercase tracking-wider mb-1">
              {t('issuerName') || 'Від кого (постачальник)'}
            </p>
            <input
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder={t('issuerPlaceholder') || 'Назва компанії або постачальника'}
              className="w-full bg-transparent text-white text-sm outline-none placeholder-white/20"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 bg-white/5 border border-white/8 rounded-xl px-4 py-3">
              <p className="text-white/35 text-[11px] uppercase tracking-wider mb-1">
                {t('amount') || 'Сума (€)'}
              </p>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-white text-sm outline-none placeholder-white/20"
              />
            </div>

            <div className="flex-1 bg-white/5 border border-white/8 rounded-xl px-4 py-3">
              <p className="text-white/35 text-[11px] uppercase tracking-wider mb-1">
                {t('date') || 'Дата'}
              </p>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-transparent text-white text-sm outline-none"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Clock size={16} className="animate-spin" />
              {t('saving') || 'Збереження...'}
            </>
          ) : (
            <>
              <Pencil size={16} />
              {t('saveChanges') || 'Зберегти зміни'}
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};

/**
 * Головна сторінка списку рахунків.
 */
export const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showSuccess, showError } = useToastContext();
  const queryClient = useQueryClient();

  // Стани UI
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editUploadedInvoice, setEditUploadedInvoice] = useState<Record<string, any> | null>(null);

  /**
   * Отримуємо поточну сесію користувача.
   */
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  /**
   * Отримуємо список рахунків.
   * Якщо немає інтернету — беремо з локального кешу.
   * Якщо є інтернет — беремо з Supabase і оновлюємо локальний кеш.
   */
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', session?.user?.id],
    queryFn: async () => {
      const userId = session?.user?.id || '';

      if (!navigator.onLine) {
        const cached = await offlineStore.getInvoices(userId);
        return cached.map((inv) => ({
          ...inv,
          document_number: inv['document_no'],
          gross_total: inv['total_gross'],
        }));
      }

      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('LOAD INVOICES ERROR:', error);

        const cached = await offlineStore.getInvoices(userId);
        return cached.map((inv) => ({
          ...inv,
          document_number: inv['document_no'],
          gross_total: inv['total_gross'],
        }));
      }

      const rows = data || [];
      await offlineStore.saveInvoices(rows);

      return rows.map((inv) => ({
        ...inv,
        document_number: inv.document_no,
        gross_total: inv.total_gross,
      }));
    },
    enabled: !!session?.user?.id,
  });

  /**
   * Форматування суми з потрібною валютою.
   */
  const formatCurrency = useCallback((amount: number, currency: string) => {
    const curr = currencies.find((c) => c.code === currency);

    return `${amount.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${curr?.symbol || currency}`;
  }, []);

  /**
   * Експорт списку рахунків у CSV.
   */
  const handleExportCSV = useCallback(() => {
    try {
      exportInvoicesToCSV(invoices);
      showSuccess(t('dataExported') || 'Data exported successfully');
    } catch (error) {
      console.error('EXPORT CSV ERROR:', error);
      showError(t('exportFailed') || 'Failed to export data');
    }
  }, [invoices, showSuccess, showError, t]);

  /**
   * Підтвердження видалення рахунку.
   * Працює і онлайн, і офлайн.
   */
  const handleDeleteConfirm = useCallback(async () => {
    if (!invoiceToDelete) return;

    try {
      if (!navigator.onLine) {
        await offlineStore.deleteInvoice(invoiceToDelete);
        await offlineStore.enqueueMutation({
          table: 'invoices',
          operation: 'delete',
          data: { id: invoiceToDelete },
          timestamp: Date.now(),
        });

        showSuccess(t('invoiceDeleted') || 'Invoice deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        return;
      }

      const { error } = await supabase.from('invoices').delete().eq('id', invoiceToDelete);
      if (error) throw error;

      await offlineStore.deleteInvoice(invoiceToDelete);

      showSuccess(t('invoiceDeleted') || 'Invoice deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error) {
      console.error('DELETE INVOICE ERROR:', error);
      showError(t('deleteFailed') || 'Failed to delete invoice');
    } finally {
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  }, [invoiceToDelete, showSuccess, showError, t, queryClient]);

  /**
   * Вкладки фільтрації.
   */
  const filterTabs: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: t('allStatuses') || 'All' },
    { key: 'draft', label: t('draft') },
    { key: 'sent', label: t('sent') },
    { key: 'paid', label: t('paid') },
    { key: 'overdue', label: t('overdue') },
  ];

  /**
   * Фільтрований список рахунків по активній вкладці.
   */
  const filteredInvoices =
    activeFilter === 'all' ? invoices : invoices.filter((inv) => inv.status === activeFilter);

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-2xl mx-auto">
      {/* Верхній заголовок сторінки */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">{t('invoices')}</h2>
          <p className="text-white/60 text-sm mt-1">{t('manageInvoices')}</p>
        </div>

        {/* Кнопки дій */}
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!invoices.length}
            className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-all disabled:opacity-50 active:scale-95"
            title={t('export')}
          >
            <Download size={16} />
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 hover:bg-teal-500/25 transition-all active:scale-95"
            title={t('uploadExternalInvoice') || 'Завантажити чужий рахунок'}
          >
            <Upload size={16} />
          </button>

          <button
            onClick={() => navigate('/invoices/new')}
            className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 text-orange-500 hover:bg-white/20 transition-all active:scale-95"
            title={t('newInvoice')}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Фільтри по статусах */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {filterTabs.map((tab) => {
          const count =
            tab.key === 'all'
              ? invoices.length
              : invoices.filter((inv) => inv.status === tab.key).length;

          const isActive = activeFilter === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-white/8 text-white/50 hover:text-white/80 hover:bg-white/12 border border-white/10'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Основний блок зі списком рахунків */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg">
        {isLoading ? (
          // Скелетон під час завантаження
          <div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-4 border-b border-white/5 animate-pulse last:border-0"
              >
                <div className="w-12 h-14 rounded-lg bg-white/10 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3 bg-white/10 rounded w-24 mb-2" />
                  <div className="h-4 bg-white/15 rounded w-40 mb-2" />
                  <div className="h-3 bg-white/8 rounded w-16" />
                </div>
                <div className="text-right">
                  <div className="h-4 bg-white/15 rounded w-20 mb-1" />
                  <div className="h-3 bg-white/8 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          // Стан, коли рахунків немає
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-orange-400" />
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">{t('noInvoicesMessage')}</h3>
            <p className="text-white/60 mb-6 text-sm">{t('createFirstIn30Sec')}</p>

            {activeFilter === 'all' && (
              <button
                onClick={() => navigate('/invoices/new')}
                className="bg-white/10 backdrop-blur-xl border border-white/10 text-orange-500 hover:bg-white/20 px-6 py-2.5 rounded-xl font-medium transition-all active:scale-95"
              >
                {t('createInvoice')}
              </button>
            )}
          </div>
        ) : (
          // Список рахунків
          <div>
            {filteredInvoices.map((invoice, index) => {
              const isUploaded = invoice.source === 'uploaded';

              return (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className={`flex items-center group ${isUploaded ? 'bg-teal-500/5' : ''}`}>
                    <div className="pl-4 flex-shrink-0">
                      {isUploaded ? (
                        <div className="w-12 h-14 rounded-lg bg-teal-500/15 border border-teal-500/25 flex-shrink-0 flex items-center justify-center">
                          <FileText size={20} className="text-teal-400" />
                        </div>
                      ) : (
                        <InvoiceThumbnail invoice={invoice} />
                      )}
                    </div>

                    {/* Клік по рядку відкриває PDF або сторінку рахунку */}
                    <button
                      className="flex-1 flex items-center gap-4 px-3 py-4 hover:bg-white/5 active:bg-white/8 transition-all text-left"
                      onClick={() => {
                        if (isUploaded && invoice.uploaded_pdf_url) {
                          window.open(invoice.uploaded_pdf_url as string, '_blank', 'noopener,noreferrer');
                        } else {
                          navigate(`/invoices/${invoice.id}/view`);
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs text-white/40">
                            {invoice.document_no || invoice.document_number || t('noDraftNumber')}
                          </span>

                          {isUploaded && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/20 font-medium">
                              PDF
                            </span>
                          )}
                        </div>

                        <div
                          className={`font-semibold text-base leading-tight truncate ${
                            isUploaded ? 'text-teal-100' : 'text-white'
                          }`}
                        >
                          {invoice.clients?.name || invoice.client_name || t('noClient')}
                        </div>

                        <div className="mt-1">
                          {isUploaded ? (
                            <span className="flex items-center gap-1 text-xs text-teal-400/70">
                              <ExternalLink size={11} />
                              {t('externalInvoice') || 'Зовнішній рахунок'}
                            </span>
                          ) : (
                            <StatusBadge status={invoice.status} t={t} />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-xs text-white/40 mb-0.5">
                            {invoice.date ? format(new Date(invoice.date), 'dd.MM.yyyy') : '—'}
                          </div>

                          <div
                            className={`font-semibold text-base ${
                              isUploaded ? 'text-teal-300' : 'text-white'
                            }`}
                          >
                            {formatCurrency(
                              Number(invoice.total_gross ?? invoice.gross_total ?? 0),
                              invoice.currency || 'EUR'
                            )}
                          </div>
                        </div>

                        <ChevronRight size={16} className="text-white/30" />
                      </div>
                    </button>

                    {/* Кнопка редагування тільки для завантажених рахунків */}
                    {isUploaded && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditUploadedInvoice(invoice);
                        }}
                        className="pl-2 py-4 text-white/30 hover:text-teal-400 transition-colors active:scale-90"
                        title={t('edit') || 'Редагувати'}
                      >
                        <Pencil size={15} />
                      </button>
                    )}

                    {/* Кнопка видалення */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInvoiceToDelete(invoice.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="pr-4 pl-2 py-4 text-white/30 hover:text-red-400 transition-colors active:scale-90 md:opacity-0 md:group-hover:opacity-100"
                      title={t('delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {index < filteredInvoices.length - 1 && <div className="ml-20 border-b border-white/5" />}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Діалог підтвердження видалення */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={t('deleteInvoice') || 'Delete Invoice'}
        description={
          t('deleteInvoiceConfirm') ||
          'Are you sure you want to delete this invoice? This action cannot be undone.'
        }
      />

      {/* Модалка завантаження зовнішнього рахунку */}
      <AnimatePresence>
        {uploadModalOpen && session?.user?.id && (
          <UploadInvoiceModal
            onClose={() => setUploadModalOpen(false)}
            userId={session.user.id}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}
          />
        )}
      </AnimatePresence>

      {/* Модалка редагування завантаженого рахунку */}
      <AnimatePresence>
        {editUploadedInvoice && (
          <EditUploadedInvoiceModal
            invoice={editUploadedInvoice}
            onClose={() => setEditUploadedInvoice(null)}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}
          />
        )}
      </AnimatePresence>
    </div>
  );
};