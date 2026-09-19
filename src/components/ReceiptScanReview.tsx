import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle, FileImage, AlertCircle } from 'lucide-react';
import { ScannedReceiptData } from '../lib/receiptOCR';
import { recognizeReceiptSmart } from '../lib/openaiReceiptOCR';
import { EXPENSE_CATEGORIES } from '../lib/expenseCategories';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

const PAYMENT_METHODS = [
  'Bar',
  'EC-Karte',
  'Kreditkarte',
  'Visa',
  'Mastercard',
  'American Express',
  'PayPal',
  'Apple Pay',
  'Google Pay',
  'TWINT',
  'Überweisung',
  'Scheck',
  'Debitkarte',
  'Maestro',
];
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'PLN', 'CZK', 'UAH'];
const VAT_RATES = ['0', '7', '10', '19', '20', '21', '23', '25'];

interface ReceiptScanReviewProps {
  file: File;
  onClose: () => void;
  onConfirm: (data: ScannedReceiptData, fileUrl: string) => void;
  /** Skip re-OCR when the scan queue already produced data */
  initialData?: ScannedReceiptData;
  /** Skip re-upload when storage URL is already known */
  initialFileUrl?: string;
}

type Phase = 'scanning' | 'review' | 'error';

function AIBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-teal-400 text-[10px] font-medium">
      <Sparkles size={9} />
      {label}
    </span>
  );
}

function FieldRow({
  label,
  detected,
  aiLabel,
  children,
}: {
  label: string;
  detected: boolean;
  aiLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</span>
        {detected && <AIBadge label={aiLabel} />}
      </div>
      {children}
    </div>
  );
}

const inputCls = (detected: boolean) =>
  `scan-review-field w-full px-3 py-2.5 rounded-xl text-sm text-slate-900 bg-slate-100 placeholder:text-slate-400 border transition-all outline-none focus:ring-1 ${
    detected
      ? 'border-teal-500/60 focus:border-teal-500 focus:ring-teal-500/30'
      : 'border-slate-300 focus:border-slate-500 focus:ring-slate-400/30'
  }`;

export default function ReceiptScanReview({
  file,
  onClose,
  onConfirm,
  initialData,
  initialFileUrl,
}: ReceiptScanReviewProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>(initialData ? 'review' : 'scanning');
  const [progress, setProgress] = useState(initialData ? 100 : 0);
  const [statusText, setStatusText] = useState('');
  const [data, setData] = useState<ScannedReceiptData | null>(initialData || null);
  const [fileUrl, setFileUrl] = useState(initialFileUrl || '');
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const isImage = /image\//i.test(file.type);
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;
    if (isImage) setPreviewUrl(URL.createObjectURL(file));

    if (initialData) {
      setData(initialData);
      setFileUrl(initialFileUrl || '');
      setPhase('review');
      return () => {
        abortRef.current = true;
      };
    }

    setStatusText(t('analyzingReceipt'));

    async function run() {
      try {
        const [scanned, uploadedUrl] = await Promise.all([
          recognizeReceiptSmart(file, (p, s) => {
            if (!abortRef.current) { setProgress(p); setStatusText(s); }
          }),
          uploadFile(),
        ]);
        if (abortRef.current) return;
        setFileUrl(uploadedUrl);
        setData(scanned);
        setPhase('review');
      } catch {
        if (!abortRef.current) setPhase('error');
      }
    }

    run();
    return () => {
      abortRef.current = true;
    };
  }, []);

  async function uploadFile(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return '';
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('scanned-documents').upload(path, file, { upsert: true, contentType: file.type });
    if (error) return '';
    const { data: { publicUrl } } = supabase.storage.from('scanned-documents').getPublicUrl(path);
    return publicUrl;
  }

  function handleConfirm() {
    if (!data) return;
    onConfirm(data, fileUrl);
  }

  const df = data?.detectedFields;
  const aiLabel = t('aiLabel');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex flex-col"
    >
      <div className="flex-1 flex flex-col min-h-0 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-500/15 flex items-center justify-center">
              <Sparkles size={16} className="text-teal-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm leading-tight">{t('scanReceiptTitle')}</h2>
              <p className="text-white/40 text-[11px] leading-tight">
                {phase === 'scanning' ? t('autoTextRecognition') : phase === 'review' ? t('reviewScannedData') : t('recognitionError')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {phase === 'review' && data && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                data.confidence >= 70 ? 'bg-green-500/15 border-green-500/30 text-green-400' :
                data.confidence >= 40 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                'bg-red-500/15 border-red-500/30 text-red-400'
              }`}>
                <CheckCircle size={11} />
                {data.confidence}% {t('confidence')}
              </div>
            )}
            <button onClick={onClose} className="p-2 rounded-xl bg-white/8 hover:bg-white/15 transition-all">
              <X size={18} className="text-white/60" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          <AnimatePresence mode="wait">
            {phase === 'scanning' && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="h-full flex flex-col items-center justify-center gap-6 p-8"
              >
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-teal-500/10 animate-ping" />
                  <div className="absolute inset-2 rounded-full bg-teal-500/15 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={32} className="text-teal-400" />
                  </div>
                </div>
                <div className="w-full max-w-xs space-y-3 text-center">
                  <p className="text-white/80 font-medium text-sm">{statusText}</p>
                  <div className="relative h-2 bg-white/8 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-teal-400 rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="text-white/30 text-xs">{progress}%</p>
                </div>
                {previewUrl && (
                  <div className="w-32 h-40 rounded-xl overflow-hidden border border-white/10 shadow-lg opacity-40">
                    <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </motion.div>
            )}

            {phase === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center"
              >
                <AlertCircle size={48} className="text-red-400" />
                <div>
                  <p className="text-white font-semibold">{t('recognitionFailed')}</p>
                  <p className="text-white/50 text-sm mt-1">{t('recognitionFailedMsg')}</p>
                </div>
                <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-all">
                  {t('close')}
                </button>
              </motion.div>
            )}

            {phase === 'review' && data && (
              <motion.div
                key="review"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col md:flex-row overflow-hidden"
              >
                <div className="hidden md:flex md:w-80 md:flex-shrink-0 border-r border-white/8 flex-col bg-black/30">
                  <div className="p-3 border-b border-white/8">
                    <div className="flex items-center gap-2 text-white/40 text-xs">
                      <FileImage size={13} />
                      <span>{t('originalReceipt')}</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-3">
                    {previewUrl ? (
                      <img src={previewUrl} alt={t('originalReceipt')} className="w-full rounded-lg shadow-lg bg-white" />
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center bg-white/5 rounded-xl border border-white/10">
                        <div className="text-center">
                          <FileImage size={32} className="text-white/20 mx-auto mb-2" />
                          <p className="text-white/30 text-xs">{t('pdfDocument')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {data.warning && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                      <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-100/90 text-xs leading-relaxed">
                        {data.warning.code === 'openai_not_configured'
                          ? (t('ocrAiUnavailableWarning') || data.warning.message)
                          : data.warning.message}
                      </p>
                    </div>
                  )}

                  {previewUrl && (
                    <div className="md:hidden h-32 rounded-xl overflow-hidden border border-white/10">
                      <img src={previewUrl} alt={t('originalReceipt')} className="w-full h-full object-cover bg-white" />
                    </div>
                  )}

                  <FieldRow label={t('storeSupplier')} detected={!!df?.has('store_name')} aiLabel={aiLabel}>
                    <input
                      className={inputCls(!!df?.has('store_name'))}
                      value={data.store_name}
                      onChange={e => setData(d => d ? { ...d, store_name: e.target.value } : d)}
                      placeholder="z.B. REWE GmbH"
                    />
                  </FieldRow>

                  <FieldRow label={t('expenseCategory')} detected={!!df?.has('category')} aiLabel={aiLabel}>
                    <select
                      className={`${inputCls(!!df?.has('category'))} cursor-pointer`}
                      value={data.category || 'other'}
                      onChange={e => setData(d => d ? { ...d, category: e.target.value } : d)}
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c} className="bg-white text-slate-900">
                          {t(`expenseCat_${c}`) || c}
                        </option>
                      ))}
                    </select>
                  </FieldRow>

                  <div className="grid grid-cols-2 gap-3">
                    <FieldRow label={t('date')} detected={!!df?.has('date')} aiLabel={aiLabel}>
                      <input
                        type="date"
                        className={inputCls(!!df?.has('date'))}
                        value={data.date}
                        onChange={e => setData(d => d ? { ...d, date: e.target.value } : d)}
                      />
                    </FieldRow>
                    <FieldRow label={t('receiptNumberLabel')} detected={!!df?.has('receipt_number')} aiLabel={aiLabel}>
                      <input
                        className={inputCls(!!df?.has('receipt_number'))}
                        value={data.receipt_number}
                        onChange={e => setData(d => d ? { ...d, receipt_number: e.target.value } : d)}
                        placeholder="—"
                      />
                    </FieldRow>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FieldRow label={t('amountGross')} detected={!!df?.has('total')} aiLabel={aiLabel}>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={inputCls(!!df?.has('total'))}
                        value={data.total}
                        onChange={e => setData(d => d ? { ...d, total: e.target.value, amount_net: !d.vat_enabled ? e.target.value : d.amount_net } : d)}
                        placeholder="0.00"
                      />
                    </FieldRow>
                    <FieldRow label={t('currency')} detected={false} aiLabel={aiLabel}>
                      <select
                        className={`${inputCls(false)} cursor-pointer`}
                        value={data.currency}
                        onChange={e => setData(d => d ? { ...d, currency: e.target.value } : d)}
                      >
                        {CURRENCIES.map(c => (
                          <option key={c} value={c} className="bg-white text-slate-900">{c}</option>
                        ))}
                      </select>
                    </FieldRow>
                  </div>

                  <FieldRow label={t('vat')} detected={!!df?.has('vat')} aiLabel={aiLabel}>
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        type="button"
                        onClick={() => setData(d => d ? { ...d, vat_enabled: !d.vat_enabled } : d)}
                        className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${data.vat_enabled ? 'bg-teal-500' : 'bg-white/15'}`}
                        style={{ height: 22, width: 40 }}
                      >
                        <span className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${data.vat_enabled ? 'translate-x-5 left-0.5' : 'left-0.5'}`}
                          style={{ width: 18, height: 18 }} />
                      </button>
                      <span className="text-xs text-white/50">{t('enableVat')}</span>
                    </div>
                    {data.vat_enabled && (
                      <div className="grid grid-cols-3 gap-2 bg-white/4 rounded-xl p-3">
                        <div>
                          <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">{t('vatRateLabel')}</p>
                          <select
                            className="scan-review-field w-full px-2 py-2 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 text-xs focus:outline-none"
                            value={data.vat_rate}
                            onChange={e => setData(d => d ? { ...d, vat_rate: e.target.value } : d)}
                          >
                            {VAT_RATES.map(r => (
                              <option key={r} value={r} className="bg-white text-slate-900">{r}%</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">{t('vatAmount')}</p>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="scan-review-field w-full px-2 py-2 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 text-xs focus:outline-none"
                            value={data.vat_amount}
                            onChange={e => setData(d => d ? { ...d, vat_amount: e.target.value } : d)}
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">{t('amountNet')}</p>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="scan-review-field w-full px-2 py-2 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 text-xs focus:outline-none"
                            value={data.amount_net}
                            onChange={e => setData(d => d ? { ...d, amount_net: e.target.value } : d)}
                          />
                        </div>
                      </div>
                    )}
                  </FieldRow>

                  <FieldRow label={t('paymentMethod')} detected={!!df?.has('payment_method')} aiLabel={aiLabel}>
                    <select
                      className={`${inputCls(!!df?.has('payment_method'))} cursor-pointer`}
                      value={data.payment_method}
                      onChange={e => setData(d => d ? { ...d, payment_method: e.target.value } : d)}
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m} value={m} className="bg-white text-slate-900">{m}</option>
                      ))}
                    </select>
                  </FieldRow>

                  <FieldRow label={t('positions')} detected={!!df?.has('items')} aiLabel={aiLabel}>
                    <textarea
                      className={`${inputCls(!!df?.has('items'))} resize-none`}
                      rows={4}
                      value={data.items}
                      onChange={e => setData(d => d ? { ...d, items: e.target.value } : d)}
                      placeholder={t('recognizedPositions')}
                    />
                  </FieldRow>

                  <div className="pb-2" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {phase === 'review' && (
          <div className="flex-shrink-0 border-t border-white/8 p-4 flex gap-3 bg-black/20">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-white/70 hover:text-white font-medium text-sm transition-all"
            >
              {t('discard')}
            </button>
            <button
              onClick={handleConfirm}
              className="flex-2 px-8 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-all active:scale-95 flex items-center gap-2 justify-center"
              style={{ flex: 2 }}
            >
              <CheckCircle size={16} />
              {t('acceptData')}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
