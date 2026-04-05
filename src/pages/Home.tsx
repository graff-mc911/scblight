import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, ChevronRight, AlertCircle, FileText } from 'lucide-react';

interface MonthData {
  month: string;
  income: number;
  expenses: number;
}

function buildMonthlyData(invoices: any[], receipts: any[]): MonthData[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const months: MonthData[] = Array.from({ length: 12 }, (_, i) => ({
    month: monthNames[i],
    income: 0,
    expenses: 0,
  }));

  for (const inv of invoices) {
    const d = new Date(inv.date || inv.created_at);
    if (d.getFullYear() === currentYear) {
      if (inv.source === 'uploaded' || inv.uploaded_pdf_url) {
        months[d.getMonth()].expenses += Number(inv.total_gross || inv.uploaded_amount || 0);
      } else {
        months[d.getMonth()].income += Number(inv.total_gross || 0);
      }
    }
  }
  for (const rec of receipts) {
    const d = new Date(rec.date || rec.created_at);
    if (d.getFullYear() === currentYear) {
      months[d.getMonth()].expenses += Number(rec.total || 0);
    }
  }
  return months;
}

function MonthlyChart({ invoices, receipts, t }: { invoices: any[]; receipts: any[]; t: (k: string) => string }) {
  const now = new Date();
  const monthData = buildMonthlyData(invoices, receipts);
  const visibleMonths = monthData.filter((_, i) => i <= now.getMonth());
  const totalIncome = monthData.reduce((s, m) => s + m.income, 0);
  const totalExpenses = monthData.reduce((s, m) => s + m.expenses, 0);
  const diff = totalIncome - totalExpenses;
  const maxVal = Math.max(...visibleMonths.flatMap((m) => [m.income, m.expenses]), 1);
  const chartHeight = 160;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  const formatAmount = (v: number) =>
    new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' €';

  const formatShort = (v: number) =>
    new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(v);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg overflow-hidden mb-6"
    >
      <div className="px-5 pt-5 pb-3">
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">{t('totalEarnings')}</p>
            <p className="text-green-400 text-2xl font-bold tracking-tight">{formatAmount(totalIncome)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">{t('totalReceipts')}</p>
            <p className="text-red-400 text-2xl font-bold tracking-tight">{formatAmount(totalExpenses)}</p>
          </div>
        </div>

        <div className="relative" style={{ height: chartHeight + 24 }}>
          <div className="absolute inset-0 flex flex-col justify-between" style={{ bottom: 24 }}>
            {gridLines.slice(1).reverse().map((ratio, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-white/25 text-[10px] w-10 text-right shrink-0">
                  {formatShort(maxVal * ratio)}
                </span>
                <div className="flex-1 border-t border-dashed border-white/10" />
              </div>
            ))}
          </div>

          <div
            className="absolute left-12 right-0 flex items-end gap-0.5"
            style={{ height: chartHeight, bottom: 24 }}
          >
            {visibleMonths.map((m, i) => {
              const hasAnyData = totalIncome > 0 || totalExpenses > 0;
              const incH = hasAnyData && maxVal > 0 ? Math.max((m.income / maxVal) * chartHeight, m.income > 0 ? 4 : 0) : 0;
              const expH = hasAnyData && maxVal > 0 ? Math.max((m.expenses / maxVal) * chartHeight, m.expenses > 0 ? 4 : 0) : 0;
              return (
                <div key={i} className="flex-1 flex items-end justify-center gap-0.5 px-0.5">
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.05, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    style={{ height: Math.max(incH, 3), transformOrigin: 'bottom' }}
                    className={`flex-1 rounded-t-sm ${incH > 0 ? 'bg-green-400/70' : 'bg-white/5'}`}
                  />
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.05 + 0.05, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    style={{ height: Math.max(expH, 3), transformOrigin: 'bottom' }}
                    className={`flex-1 rounded-t-sm ${expH > 0 ? 'bg-red-400/70' : 'bg-white/5'}`}
                  />
                </div>
              );
            })}
          </div>

          <div
            className="absolute left-12 right-0 flex"
            style={{ bottom: 0, height: 24 }}
          >
            {visibleMonths.map((m, i) => (
              <div key={i} className="flex-1 flex items-center justify-center">
                <span className="text-white/30 text-[10px] text-center">{m.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-green-400/70" />
            <span className="text-white/40 text-xs">{t('totalEarnings')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-400/70" />
            <span className="text-white/40 text-xs">{t('totalReceipts')}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-white/40 text-xs">Differenz</span>
          <span className={`text-sm font-semibold ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatAmount(diff)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export const Home: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(name)')
        .eq('user_id', session?.user?.id || '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ['receipts', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', session?.user?.id || '');
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-count', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', session?.user?.id || '');
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  const totalEarnings = invoices
    .filter((inv) => inv.status === 'paid' && inv.source !== 'uploaded' && !inv.uploaded_pdf_url)
    .reduce((sum, inv) => sum + Number(inv.total_gross || 0), 0);

  const unpaidTotal = invoices
    .filter((inv) => (inv.status === 'sent' || inv.status === 'draft') && inv.source !== 'uploaded' && !inv.uploaded_pdf_url)
    .reduce((sum, inv) => sum + Number(inv.total_gross || 0), 0);

  const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue' && inv.source !== 'uploaded' && !inv.uploaded_pdf_url);
  const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + Number(inv.total_gross || 0), 0);

  const formatAmount = (v: number) =>
    new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' €';

  const quickActions = [
    {
      label: t('newInvoice'),
      icon: Plus,
      color: 'text-orange-400',
      bg: 'bg-orange-500/15 border-orange-500/20',
      onClick: () => navigate('/invoices/new'),
    },
    {
      label: t('createPdfBtn'),
      icon: FileText,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/15 border-cyan-500/20',
      onClick: () => navigate('/pdf-creator'),
    },
    {
      label: t('newClient'),
      icon: Users,
      color: 'text-green-400',
      bg: 'bg-green-500/15 border-green-500/20',
      onClick: () => navigate('/clients/new'),
    },
  ];

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-1">{t('appName')}</h1>
        <p className="text-white/50 text-sm">{t('appSubtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-white/50 text-xs mb-1.5">{t('unpaid')}</p>
          <h2 className="text-xl font-semibold text-orange-400 leading-tight">{formatAmount(unpaidTotal)}</h2>
        </Card>

        <Card className="p-4">
          <p className="text-white/50 text-xs mb-1.5">{t('totalInvoices')}</p>
          <h2 className="text-xl font-semibold text-white leading-tight">{invoices.length}</h2>
        </Card>

        <Card className="p-4">
          <p className="text-white/50 text-xs mb-1.5">{t('clients')}</p>
          <h2 className="text-xl font-semibold text-green-400 leading-tight">{clients.length}</h2>
        </Card>

        <Card className="p-4" onClick={() => navigate('/receipts')} style={{ cursor: 'pointer' }}>
          <p className="text-white/50 text-xs mb-1.5">{t('receiptsCount') || 'Кількість чеків'}</p>
          <h2 className="text-xl font-semibold text-cyan-400 leading-tight">{receipts.length}</h2>
        </Card>
      </div>

      {overdueInvoices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => navigate('/invoices')}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-red-500/10 border border-red-500/25 rounded-2xl hover:bg-red-500/15 transition-all active:scale-[0.99]"
          >
            <div className="w-9 h-9 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} className="text-red-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-red-300 font-semibold text-sm">{t('overdueInvoices')}</p>
              <p className="text-red-400/70 text-xs mt-0.5">
                {overdueInvoices.length} {overdueInvoices.length === 1 ? t('invoice') : t('invoices')} · {formatAmount(overdueTotal)}
              </p>
            </div>
            <ChevronRight size={16} className="text-red-400/50" />
          </button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6"
      >
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3">{t('quickActions')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`flex flex-col items-center gap-2 px-3 py-4 rounded-2xl transition-all active:scale-95 hover:brightness-110`}
            >
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center`}>
                <action.icon size={20} className={action.color} />
              </div>
              <span className="text-white/70 text-xs font-medium text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <MonthlyChart invoices={invoices} receipts={receipts} t={t} />
    </div>
  );
};
