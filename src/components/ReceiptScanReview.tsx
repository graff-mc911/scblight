import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle, FileImage, AlertCircle } from 'lucide-react';
import { extractReceiptData, ScannedReceiptData } from '../lib/receiptOCR';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

const PAYMENT_METHODS = ['Bar', 'EC-Karte', 'Kreditkarte', 'Visa', 'Mastercard', 'American Express', 'PayPal', 'Apple Pay', 'Google Pay', 'TWINT', 'Ãœberweisung', 'Scheck'];
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'PLN', 'CZK', 'UAH'];
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'scanned-documents';

interface ReceiptScanReviewProps {
  file: File;
  onClose: () => void;
  onConfirm: (data: ScannedReceiptData, fileUrl: string) => void;
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

const inputCls = (detected: boolean) =>
  `w-full px-3 py-2.5 rounded-xl text-sm text-white bg-white/6 border transition-all outline-none focus:ring-1 ${
    detected
      ? 'border-teal-500/40 focus:border-teal-400 focus:ring-teal-400/20'
      : 'border-white/10 focus:border-white/30 focus:ring-white/10'
  }`;

export default function ReceiptScanReview({ file, onClose, onConfirm }: ReceiptScanReviewProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [data, setData] = useState<ScannedReceiptData | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const isImage = /image\//i.test(file.type);
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;
    if (isImage) setPreviewUrl(URL.createObjectURL(file));
    setStatusText(t('analyzingReceipt'));

    async function run() {
      try {
        const [scanned, uploadedUrl] = await Promise.all([
          extractReceiptData(file, (p, s) => {
            if (!abortRef.current) { setProgress(p); setStatusText(s); }
          }),
          uploadFile(),
        ]);
        if (abortRef.current) return;
        setFileUrl(uploadedUrl);
        setData(scanned);
        setPhase('review');
      } catch (err) {
        if (abortRef.current) return;
        if (err instanceof Error && err.message === 'BUCKET_NOT_FOUND') {
          setError(`Bucket "${STORAGE_BUCKET}" не знайдено. Створіть його в Supabase Storage або задайте VITE_SUPABASE_STORAGE_BUCKET.`);
        }
        setPhase('error');
      }
    }

    run();
    return () => { abortRef.current = true; };
  }, []);

  async function uploadFile(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return '';
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      if (error.message?.includes('Bucket not found')) {
        throw new Error('BUCKET_NOT_FOUND');
      }
      return '';
    }
    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return publicUrl;
  }

  function handleConfirm() {
    if (!data) return;
    onConfirm(data, fileUrl);
  }

  const df = data?.detectedFields;
  const aiLabel = t('aiLabel');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex flex-col">
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
              <motion.div key="scanning" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="h-full flex flex-col items-center justify-center gap-6 p-8">
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
                    <motion.div className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-teal-400 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
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
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
                <AlertCircle size={48} className="text-red-400" />
                <div>
                  <p className="text-white font-semibold">{t('recognitionFailed')}</p>
                  <p className="text-white/50 text-sm mt-1">{error || t('recognitionFailedMsg')}</p>
                </div>
                <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-all">
                  {t('close')}
                </button>
              </motion.div>
            )}

            {/* решта UI без змін */}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
