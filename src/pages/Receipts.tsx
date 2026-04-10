import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, ChevronRight, CheckCircle, Download, Trash2, FileText, Upload, X, ZoomIn } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { downloadReceiptPDF } from '../lib/receiptPdfGenerator';
import ReceiptScanReview from '../components/ReceiptScanReview';
import { ScannedReceiptData } from '../lib/receiptOCR';

interface ReceiptType {
  id: string;
  store_name: string;
  date: string;
  total: number;
  items: string;
  payment_method: string;
  receipt_number: string;
  file_url: string;
  created_at: string;
}

const ReceiptThumbnail: React.FC<{ fileUrl?: string; onView?: () => void }> = ({ fileUrl, onView }) => {
  const [imgError, setImgError] = useState(false);

  if (fileUrl && !imgError) {
    const isImage = /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/i.test(fileUrl);
    if (isImage) {
      return (
        <div
          className={`w-12 h-14 rounded-lg bg-white/10 border border-white/10 flex-shrink-0 overflow-hidden relative group ${onView ? 'cursor-pointer' : ''}`}
          onClick={onView}
        >
          <img src={fileUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
          {onView && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn size={14} className="text-white" />
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="w-12 h-14 rounded-lg bg-white/10 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
        <Receipt size={20} className="text-white/40" />
      </div>
    );
  }

  return (
    <div className="w-12 h-14 rounded-lg bg-white/10 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
      <div className="w-full h-full p-1 flex flex-col gap-0.5 justify-center">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`h-px rounded-full ${i === 1 ? 'bg-white/40 w-3/4' : i === 2 ? 'bg-white/20 w-full' : 'bg-white/15 w-full'}`}
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

const PaidBadge: React.FC<{ method: string }> = ({ method }) => {
  if (!method) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-white/50">
      <CheckCircle size={12} className="text-white/40" />
      {method}
    </span>
  );
};

export default function Receipts() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showSuccess, showError } = useToastContext();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', session?.user?.id || '')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []) as ReceiptType[];
    },
    enabled: !!session?.user?.id,
  });

  const formatCurrency = useCallback((amount: number, currency?: string) => {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ' + (currency || '€');
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!receiptToDelete) return;
    try {
      const { error } = await supabase.from('receipts').delete().eq('id', receiptToDelete);
      if (error) throw error;
      showSuccess(t('receiptDeleted') || 'Receipt deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    } catch {
      showError(t('deleteFailed') || 'Failed to delete receipt');
    } finally {
      setDeleteDialogOpen(false);
      setReceiptToDelete(null);
    }
  }, [receiptToDelete, showSuccess, showError, t, queryClient]);

  const handleUploadFromDevice = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (file.size > 20 * 1024 * 1024) { showError('Datei zu groß (max. 20 MB)'); return; }
    setScanFile(file);
  }, [showError]);

  const handleScanConfirm = useCallback(async (data: ScannedReceiptData, fileUrl: string) => {
    setScanFile(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/unlock'); return; }

      const gross = parseFloat(data.total) || 0;
      const receiptData = {
        user_id: user.id,
        store_name: data.store_name || '',
        issuer_name: data.store_name || '',
        date: data.date || new Date().toISOString().split('T')[0],
        total: gross,
        amount_gross: gross,
        amount_net: parseFloat(data.amount_net) || 0,
        vat_rate: parseFloat(data.vat_rate) || 0,
        vat_amount: parseFloat(data.vat_amount) || 0,
        vat_enabled: data.vat_enabled,
        currency: data.currency || 'EUR',
        items: data.items || '',
        payment_method: data.payment_method || 'Bar',
        receipt_number: data.receipt_number || '',
        file_url: fileUrl || '',
        updated_at: new Date().toISOString(),
      };

      const { data: saved, error } = await supabase
        .from('receipts')
        .insert([receiptData])
        .select()
        .maybeSingle();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['receipts'] });

      if (saved?.id) {
        navigate(`/receipt/${saved.id}`);
      } else {
        navigate('/receipts');
      }
    } catch {
      showError('Beleg konnte nicht gespeichert werden');
      navigate('/receipts');
    }
  }, [navigate, queryClient, showError]);

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">{t('allReceipts') || t('receipts')}</h2>
          <p className="text-white/60 text-sm mt-1">{t('manageReceipts') || 'Manage your receipts'}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-white/8 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white/90 transition-all active:scale-95"
            title="Foto vom Gerät hochladen"
          >
            <Upload size={18} />
          </button>
          <button
            onClick={() => navigate('/pdf-creator')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 transition-all active:scale-95 text-sm font-medium"
          >
            <FileText size={16} />
            {t('createPdfBtn')}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleUploadFromDevice} className="hidden" />

      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg">
        {isLoading ? (
          <div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-white/5 animate-pulse last:border-0">
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
        ) : receipts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Receipt size={32} className="text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('receiptsNotFound') || 'No receipts yet'}</h3>
            <p className="text-white/60 mb-6 text-sm">{t('addFirstReceipt') || 'Scan or upload your first receipt to get started'}</p>
            <button
              onClick={() => navigate('/pdf-creator')}
              className="bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 px-6 py-2.5 rounded-xl font-medium transition-all active:scale-95 flex items-center gap-2 mx-auto"
            >
              <FileText size={16} />
              {t('createPdfBtn')}
            </button>
          </div>
        ) : (
          <div>
            {receipts.map((receipt, index) => (
              <motion.div
                key={receipt.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <div className="flex items-center w-full group">
                  <div className="pl-4">
                    <ReceiptThumbnail
                      fileUrl={receipt.file_url}
                      onView={/\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/i.test(receipt.file_url || '') ? () => setViewerUrl(receipt.file_url) : undefined}
                    />
                  </div>
                  <button
                    className="flex-1 min-w-0 flex items-center gap-4 px-3 py-4 hover:bg-white/5 active:bg-white/8 transition-all text-left"
                    onClick={() => navigate(`/receipt/${receipt.id}`)}
                  >
                    <div style={{ display: 'none' }} />

                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/40 mb-0.5">
                        {receipt.receipt_number ? `Ausgabe ${receipt.receipt_number}` : '—'}
                      </div>
                      <div className="font-semibold text-white text-base leading-tight truncate">
                        {receipt.store_name || '—'}
                      </div>
                      <div className="mt-1">
                        <PaidBadge method={receipt.payment_method} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-white/40 mb-0.5">
                          {receipt.date ? format(new Date(receipt.date), 'dd.MM.yyyy') : '—'}
                        </div>
                        <div className="font-semibold text-white text-base">
                          {formatCurrency(Number(receipt.total || 0))}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-white/30" />
                    </div>
                  </button>

                  <button
                    className="mr-1 p-2 rounded-lg bg-white/10 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/30 text-white/50 hover:text-orange-400 transition-all active:scale-95 flex-shrink-0"
                    title={t('saveAsPdf') || 'Save as PDF'}
                    onClick={async (e) => {
                      e.stopPropagation();
                      await downloadReceiptPDF(receipt);
                    }}
                  >
                    <Download size={14} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReceiptToDelete(receipt.id);
                      setDeleteDialogOpen(true);
                    }}
                    className="mr-3 pl-1 pr-2 py-4 text-white/30 hover:text-red-400 transition-colors active:scale-90 md:opacity-0 md:group-hover:opacity-100"
                    title={t('delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {index < receipts.length - 1 && (
                  <div className="ml-20 border-b border-white/5" />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setReceiptToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        title={t('deleteReceipt') || 'Delete Receipt'}
        description={t('deleteReceiptConfirm') || 'Are you sure you want to delete this receipt? This action cannot be undone.'}
      />

      <AnimatePresence>
        {viewerUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black flex flex-col"
            onClick={() => setViewerUrl(null)}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-black/90 border-b border-white/5" onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewerUrl(null)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all">
                <X size={20} className="text-white" />
              </button>
              <span className="text-white/70 text-sm font-medium">Original-Beleg</span>
              <div className="w-10" />
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-start justify-center" onClick={e => e.stopPropagation()}>
              <img src={viewerUrl} alt="Original receipt" className="max-w-full rounded-lg shadow-2xl" style={{ minWidth: '100%', objectFit: 'contain' }} />
            </div>
            <div className="p-3 bg-black/90 border-t border-white/5">
              <p className="text-white/30 text-xs text-center">Antippen zum Schließen</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
}
