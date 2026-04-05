import React, { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, ChevronRight, CheckCircle, Clock, AlertCircle, Send, PenTool } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { currencies } from '../lib/languages';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { motion } from 'framer-motion';

const InvoiceThumbnail: React.FC = () => (
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

export const ClientInvoices: React.FC = () => {
  const { id: clientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showSuccess, showError } = useToastContext();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId || '')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['client-invoices', clientId, session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', session?.user?.id || '')
        .eq('client_id', clientId || '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(inv => ({
        ...inv,
        document_number: inv.document_no,
        gross_total: inv.total_gross,
      }));
    },
    enabled: !!session?.user?.id && !!clientId,
  });

  const formatCurrency = useCallback((amount: number, currency: string) => {
    const curr = currencies.find((c) => c.code === currency);
    return `${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr?.symbol || currency}`;
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!invoiceToDelete) return;
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceToDelete);
      if (error) throw error;
      showSuccess(t('invoiceDeleted') || 'Invoice deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
    } catch {
      showError(t('deleteFailed') || 'Failed to delete invoice');
    } finally {
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  }, [invoiceToDelete, showSuccess, showError, t, queryClient]);

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.gross_total || 0), 0);

  const totalUnpaid = invoices
    .filter(i => i.status !== 'paid')
    .reduce((s, i) => s + Number(i.gross_total || 0), 0);

  return (
    <div className="min-h-screen pt-16 pb-28 px-4 md:px-6 max-w-2xl mx-auto">
      <div className="pt-6 pb-4">
        <button
          onClick={() => navigate('/clients')}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">{t('clients')}</span>
        </button>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">{client?.name || '...'}</h1>
            {client?.address && (
              <p className="text-white/50 text-sm mt-1">{client.address}</p>
            )}
            {client?.client_number && (
              <p className="text-white/40 text-xs mt-0.5">#{client.client_number}</p>
            )}
          </div>
          <button
            onClick={() => navigate(`/invoices/new?client_id=${clientId}`)}
            className="shrink-0 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="h-5 w-5 text-white" />
          </button>
        </div>

        {invoices.length > 0 && (
          <div className="flex gap-3 mt-4">
            <div className="flex-1 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3">
              <p className="text-white/40 text-xs mb-1">{t('paid') || 'Bezahlt'}</p>
              <p className="text-green-400 font-semibold text-sm">
                {formatCurrency(totalPaid, invoices[0]?.currency || 'EUR')}
              </p>
            </div>
            <div className="flex-1 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3">
              <p className="text-white/40 text-xs mb-1">{t('unpaid') || 'Offen'}</p>
              <p className="text-red-400 font-semibold text-sm">
                {formatCurrency(totalUnpaid, invoices[0]?.currency || 'EUR')}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg mt-2">
        {isLoading ? (
          <div>
            {[1, 2, 3].map((i) => (
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
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-white/30" />
            </div>
            <p className="text-white/50 text-sm mb-5">{t('noInvoicesMessage')}</p>
            <button
              onClick={() => navigate(`/invoices/new?client_id=${clientId}`)}
              className="px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl active:scale-95 transition-transform"
            >
              {t('newInvoice') || 'Neue Rechnung'}
            </button>
          </div>
        ) : (
          <div>
            {invoices.map((invoice, index) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <button
                  className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 active:bg-white/8 transition-all text-left"
                  onClick={() => navigate(`/invoices/${invoice.id}/view`)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setInvoiceToDelete(invoice.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <InvoiceThumbnail />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs text-white/40">
                        {invoice.document_number || t('draft')}
                      </span>
                      {invoice.signature_data_url && (
                        <PenTool size={11} className="text-blue-400 shrink-0" />
                      )}
                      {invoice.sent_at && (
                        <Send size={11} className="text-green-400 shrink-0" />
                      )}
                    </div>
                    <div className="font-semibold text-white text-base leading-tight truncate">
                      {client?.name || t('noClient')}
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={invoice.status} t={t} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-white/40 mb-0.5">
                        {invoice.date ? format(new Date(invoice.date), 'dd.MM.yyyy') : '—'}
                      </div>
                      <div className="font-semibold text-white text-base">
                        {formatCurrency(Number(invoice.gross_total || 0), invoice.currency || 'EUR')}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-white/30" />
                  </div>
                </button>

                {index < invoices.length - 1 && (
                  <div className="ml-20 border-b border-white/5" />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={t('deleteInvoice') || 'Delete Invoice'}
        description={t('deleteInvoiceConfirm') || 'Are you sure you want to delete this invoice? This action cannot be undone.'}
      />
    </div>
  );
};
