import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  UploadCloud,
  FileImage,
  ImagePlus,
  Loader2,
  RefreshCw,
  ScanLine,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';
import { ScanCropEditor } from '../components/ScanCropEditor';
import ReceiptScanReview from '../components/ReceiptScanReview';
import {
  arrayBufferToFile,
  deserializeOcr,
  isLikelyCellular,
  scanQueue,
  ScanQueueItem,
  serializeOcr,
} from '../lib/scanQueue';
import { extractReceiptData } from '../lib/receiptOCR';
import { saveExpenseFromScan, uploadScannedFile } from '../lib/scanSync';

function QueueThumb({ item }: { item: ScanQueueItem }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!item.mimeType.startsWith('image/')) return;
    const objectUrl = URL.createObjectURL(
      arrayBufferToFile(item.blob, item.fileName, item.mimeType),
    );
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [item.id, item.blob, item.fileName, item.mimeType]);

  if (!url) {
    return <FileImage size={18} className="text-white/35" />;
  }
  return <img src={url} alt="" className="w-full h-full object-cover" />;
}

type FeatureBlock = {
  id: string;
  titleKey: string;
  descKey: string;
  bullets: string[];
  icon: React.ElementType;
};

const FEATURES: FeatureBlock[] = [
  {
    id: 'digitize',
    titleKey: 'scanDigitizeTitle',
    descKey: 'scanDigitizeDesc',
    bullets: ['scanDigitizeBenefit1', 'scanDigitizeBenefit2', 'scanDigitizeBenefit3'],
    icon: Camera,
  },
  {
    id: 'recognize',
    titleKey: 'scanRecognitionTitle',
    descKey: 'scanRecognitionDesc',
    bullets: ['scanRecognitionBenefit1', 'scanRecognitionBenefit2', 'scanRecognitionBenefit3'],
    icon: ScanLine,
  },
  {
    id: 'batch',
    titleKey: 'scanBatchTitle',
    descKey: 'scanBatchDesc',
    bullets: ['scanBatchBenefit1', 'scanBatchBenefit2', 'scanBatchBenefit3'],
    icon: UploadCloud,
  },
  {
    id: 'sync',
    titleKey: 'scanSyncTitle',
    descKey: 'scanSyncDesc',
    bullets: ['scanSyncBenefit1', 'scanSyncBenefit2', 'scanSyncBenefit3'],
    icon: CheckCircle2,
  },
  {
    id: 'offline',
    titleKey: 'scanOfflineTitle',
    descKey: 'scanOfflineDesc',
    bullets: ['scanOfflineBenefit1', 'scanOfflineBenefit2', 'scanOfflineBenefit3'],
    icon: Wifi,
  },
];

function statusLabel(status: ScanQueueItem['status'], t: (k: string) => string) {
  switch (status) {
    case 'queued':
      return t('queuePending');
    case 'uploading':
      return t('queueUploading');
    case 'recognizing':
      return t('recognizing');
    case 'pending_upload':
      return t('queueOffline');
    case 'ready':
      return t('queueReady');
    case 'failed':
      return t('queueFailed');
    case 'synced':
      return t('queueSynced');
    default:
      return status;
  }
}

export default function ScanReceipt() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastContext();
  const queryClient = useQueryClient();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  const [items, setItems] = useState<ScanQueueItem[]>([]);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [wifiOnly, setWifiOnly] = useState(() => localStorage.getItem('scanWifiOnly') === '1');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [reviewItem, setReviewItem] = useState<ScanQueueItem | null>(null);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const refresh = useCallback(async () => {
    const list = await scanQueue.list();
    setItems(list.filter((i) => i.status !== 'synced'));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('scanWifiOnly', wifiOnly ? '1' : '0');
  }, [wifiOnly]);

  useEffect(() => {
    if (!liveStream || !videoRef.current) return;
    videoRef.current.srcObject = liveStream;
    videoRef.current.play().catch(() => undefined);
    return () => {
      liveStream.getTracks().forEach((tr) => tr.stop());
    };
  }, [liveStream]);

  const canUploadNow = useCallback(() => {
    if (!navigator.onLine) return false;
    if (wifiOnly && isLikelyCellular()) return false;
    return true;
  }, [wifiOnly]);

  const processNext = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const list = await scanQueue.list();
      const next = list.find(
        (i) =>
          i.status === 'queued' ||
          i.status === 'failed' ||
          (i.status === 'pending_upload' && canUploadNow()),
      );
      if (!next) return;

      const file = arrayBufferToFile(next.blob, next.fileName, next.mimeType);
      let fileUrl = next.fileUrl || '';
      let ocrData = next.ocrData;

      try {
        if (!fileUrl && canUploadNow()) {
          await scanQueue.put({ ...next, status: 'uploading', error: undefined });
          await refresh();
          fileUrl = await uploadScannedFile(file);
        }

        if (!ocrData) {
          await scanQueue.put({
            ...next,
            status: 'recognizing',
            fileUrl: fileUrl || next.fileUrl,
            error: undefined,
          });
          await refresh();
          const ocr = await extractReceiptData(file);
          ocrData = serializeOcr(ocr);
        }

        if (!fileUrl) {
          if (!canUploadNow()) {
            await scanQueue.put({
              ...next,
              status: 'pending_upload',
              ocrData,
              error: undefined,
            });
            await refresh();
            return;
          }
          await scanQueue.put({
            ...next,
            status: 'uploading',
            ocrData,
            error: undefined,
          });
          await refresh();
          fileUrl = await uploadScannedFile(file);
        }

        await scanQueue.put({
          ...next,
          status: 'ready',
          fileUrl,
          ocrData,
          error: undefined,
        });
        await refresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'failed';
        await scanQueue.put({
          ...next,
          status: 'failed',
          fileUrl: fileUrl || next.fileUrl,
          ocrData: ocrData || next.ocrData,
          error: message,
        });
        await refresh();
      }
    } finally {
      processingRef.current = false;
      const list = await scanQueue.list();
      const hasWork = list.some(
        (i) =>
          i.status === 'queued' ||
          i.status === 'failed' ||
          (i.status === 'pending_upload' && canUploadNow()),
      );
      if (hasWork) {
        void processNext();
      }
    }
  }, [canUploadNow, refresh]);

  useEffect(() => {
    if (online) void processNext();
  }, [online, wifiOnly, items.length, processNext]);

  const enqueueFile = useCallback(
    async (file: File) => {
      if (file.size > 20 * 1024 * 1024) {
        showError(t('fileTooLarge') || 'File too large (max 20 MB)');
        return;
      }
      await scanQueue.enqueue(file, { wifiOnly });
      showSuccess(t('addedToQueue'));
      await refresh();
      void processNext();
    },
    [wifiOnly, showError, showSuccess, t, refresh, processNext],
  );

  const handlePickedFile = useCallback((file: File | undefined) => {
    if (!file) return;
    if (file.type.startsWith('image/')) {
      setCropFile(file);
      return;
    }
    void enqueueFile(file);
  }, [enqueueFile]);

  const stopLiveCamera = useCallback(() => {
    setLiveStream((prev) => {
      prev?.getTracks().forEach((tr) => tr.stop());
      return null;
    });
  }, []);

  const startLiveCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      setLiveStream(stream);
    } catch {
      cameraInputRef.current?.click();
    }
  }, []);

  const captureFromLive = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!blob) return;
    stopLiveCamera();
    const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setCropFile(file);
  }, [stopLiveCamera]);

  const openReview = async (item: ScanQueueItem) => {
    const fresh = await scanQueue.get(item.id);
    if (fresh) setReviewItem(fresh);
  };

  const handleReviewConfirm = async (
    data: Parameters<typeof saveExpenseFromScan>[0],
    fileUrl: string,
  ) => {
    if (!reviewItem) return;
    try {
      let url = fileUrl || reviewItem.fileUrl || '';
      if (!url) {
        const file = arrayBufferToFile(
          reviewItem.blob,
          reviewItem.fileName,
          reviewItem.mimeType,
        );
        url = await uploadScannedFile(file);
      }
      await saveExpenseFromScan(data, url);
      await scanQueue.put({ ...reviewItem, status: 'synced', fileUrl: url });
      await scanQueue.remove(reviewItem.id);
      setReviewItem(null);
      showSuccess(t('scanSavedToExpenses'));
      queryClient.invalidateQueries({ queryKey: ['expense_documents'] });
      await refresh();
      navigate('/receipts');
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : t('errorSavingReceipt'));
    }
  };

  const removeItem = async (id: string) => {
    await scanQueue.remove(id);
    await refresh();
  };

  const retryItem = async (item: ScanQueueItem) => {
    await scanQueue.put({ ...item, status: 'queued', error: undefined });
    await refresh();
    void processNext();
  };

  const reviewFile =
    reviewItem &&
    arrayBufferToFile(reviewItem.blob, reviewItem.fileName, reviewItem.mimeType);

  return (
    <div className="min-h-screen pt-20 pb-28 px-4 md:px-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-orange-400/80 text-xs font-medium uppercase tracking-wider mb-1">
          {t('scanner')}
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white leading-tight">
          {t('scanReceiptTitle')}
        </h1>
        <p className="text-white/55 text-sm mt-2 max-w-prose">{t('scanPageSubtitle')}</p>
      </div>

      {!online && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-sm">
          <WifiOff size={16} className="flex-shrink-0" />
          {t('waitingForWifi')}
        </div>
      )}

      <section className="mb-8" aria-labelledby="scan-capture-heading">
        <h2 id="scan-capture-heading" className="sr-only">
          {t('scanDigitizeTitle')}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void startLiveCamera()}
            className="flex flex-col items-center gap-2 px-3 py-5 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:bg-orange-500/25 active:scale-[0.98] transition-all"
          >
            <Camera size={28} />
            <span className="text-sm font-semibold text-center leading-tight">{t('takePhoto')}</span>
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center gap-2 px-3 py-5 rounded-2xl bg-white/8 border border-white/10 text-white/80 hover:bg-white/12 active:scale-[0.98] transition-all"
          >
            <ImagePlus size={28} />
            <span className="text-sm font-semibold text-center leading-tight">
              {t('uploadFromGallery')}
            </span>
          </button>
        </div>
        <p className="text-white/35 text-xs mt-3 text-center">{t('captureNextHint')}</p>

        <label className="mt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8 cursor-pointer">
          <input
            type="checkbox"
            checked={wifiOnly}
            onChange={(e) => setWifiOnly(e.target.checked)}
            className="accent-orange-500"
          />
          <div>
            <p className="text-white/80 text-sm font-medium">{t('wifiOnlyLabel')}</p>
            <p className="text-white/40 text-xs">{t('wifiOnlyHint')}</p>
          </div>
        </label>
      </section>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handlePickedFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = '';
          if (files.length === 1 && files[0].type.startsWith('image/')) {
            handlePickedFile(files[0]);
            return;
          }
          files.forEach((f) => {
            if (f.type.startsWith('image/') && files.length === 1) {
              handlePickedFile(f);
            } else {
              void enqueueFile(f);
            }
          });
        }}
      />

      <section className="mb-10" aria-labelledby="scan-queue-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="scan-queue-heading" className="text-lg font-semibold text-white">
            {t('scanQueueTitle')}
          </h2>
          <button
            type="button"
            onClick={() => navigate('/receipts')}
            className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
          >
            {t('openExpenses')}
            <ChevronRight size={14} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center">
            <FileImage size={28} className="text-white/25 mx-auto mb-3" />
            <p className="text-white/45 text-sm">{t('scanQueueEmpty')}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/6 border border-white/8"
              >
                <div className="w-11 h-14 rounded-lg bg-black/40 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  <QueueThumb item={item} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.fileName}</p>
                  <p className="text-white/40 text-xs mt-0.5 flex items-center gap-1.5">
                    {(item.status === 'uploading' || item.status === 'recognizing') && (
                      <Loader2 size={12} className="animate-spin text-orange-400" />
                    )}
                    {statusLabel(item.status, t)}
                    {!online && item.status === 'queued' ? ` · ${t('queueOffline')}` : ''}
                  </p>
                  {item.error && (
                    <p className="text-red-400/80 text-[11px] mt-0.5 truncate">{item.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(item.status === 'ready' ||
                    (item.status === 'pending_upload' && item.ocrData)) && (
                    <button
                      type="button"
                      onClick={() => void openReview(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-600/80 text-white text-xs font-medium"
                    >
                      {t('reviewNow')}
                    </button>
                  )}
                  {item.status === 'failed' && (
                    <button
                      type="button"
                      onClick={() => void retryItem(item)}
                      className="p-2 rounded-lg bg-white/8 text-white/70"
                      aria-label={t('retake')}
                    >
                      <RefreshCw size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void removeItem(item.id)}
                    className="p-2 rounded-lg text-white/30 hover:text-red-400"
                    aria-label={t('delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-8">
        {FEATURES.map((feature, index) => (
          <motion.section
            key={feature.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: index * 0.04 }}
            aria-labelledby={`feature-${feature.id}`}
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0">
                <feature.icon size={18} className="text-orange-400" />
              </div>
              <div>
                <h2 id={`feature-${feature.id}`} className="text-lg font-semibold text-white">
                  {t(feature.titleKey)}
                </h2>
                <p className="text-white/50 text-sm mt-1">{t(feature.descKey)}</p>
              </div>
            </div>
            <ul className="ml-12 space-y-1.5">
              {feature.bullets.map((key) => (
                <li key={key} className="text-white/65 text-sm flex gap-2">
                  <span className="text-orange-400/80 mt-1.5 w-1 h-1 rounded-full bg-orange-400 flex-shrink-0" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </motion.section>
        ))}
      </div>

      <AnimatePresence>
        {liveStream && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                onClick={stopLiveCamera}
                className="p-2 rounded-full bg-white/10"
              >
                <X size={20} className="text-white" />
              </button>
              <p className="text-white/70 text-sm">{t('alignReceiptHint')}</p>
              <div className="w-10" />
            </div>
            <div className="flex-1 relative overflow-hidden">
              <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-8 border-2 border-white/40 rounded-2xl pointer-events-none" />
            </div>
            <div className="p-6 flex justify-center">
              <button
                type="button"
                onClick={() => void captureFromLive()}
                className="w-18 h-18 rounded-full border-4 border-white/80 bg-orange-500 active:scale-95 transition-transform"
                style={{ width: 72, height: 72 }}
                aria-label={t('capture')}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cropFile && (
          <ScanCropEditor
            file={cropFile}
            onCancel={() => setCropFile(null)}
            onConfirm={(file) => {
              setCropFile(null);
              void enqueueFile(file);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reviewItem && reviewFile && (
          <ReceiptScanReview
            file={reviewFile}
            onClose={() => setReviewItem(null)}
            onConfirm={handleReviewConfirm}
            initialData={reviewItem.ocrData ? deserializeOcr(reviewItem.ocrData) : undefined}
            initialFileUrl={reviewItem.fileUrl}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
