import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { ArrowLeft, Save, Upload, X, ZoomIn, FileImage, Download } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { useLanguage } from '../contexts/LanguageContext';
import { AnimatePresence, motion } from 'framer-motion';
import { downloadReceiptPDF } from '../lib/receiptPdfGenerator';

interface ReceiptFormData {
  receipt_number: string;
  date: string;
  store_name: string;
  items: string;
  payment_method: string;
  vat_enabled: boolean;
  amount_net: string;
  vat_rate: string;
  vat_amount: string;
  amount_gross: string;
  currency: string;
  signature_data: string;
  file_url: string;
  total: string;
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'PLN', 'CZK', 'UAH'];
const VAT_RATES = ['0', '7', '10', '19', '20', '21', '23', '25'];
const PAYMENT_METHODS = ['Bar', 'EC-Karte', 'Kreditkarte', 'Visa', 'Mastercard', 'American Express', 'PayPal', 'Apple Pay', 'Google Pay', 'TWINT', 'Überweisung', 'Scheck'];

function formatCurrencySymbol(currency: string): string {
  const map: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', PLN: 'zł', CZK: 'Kč', UAH: '₴' };
  return map[currency] || currency;
}

export default function ReceiptForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const isEdit = id !== 'new';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autosaveIdRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout>();
  const isSavedManuallyRef = useRef(false);

  const [formData, setFormData] = useState<ReceiptFormData>({
    receipt_number: '',
    date: new Date().toISOString().split('T')[0],
    store_name: '',
    items: '',
    payment_method: 'Bar',
    vat_enabled: false,
    amount_net: '',
    vat_rate: '19',
    vat_amount: '0.00',
    amount_gross: '',
    currency: 'EUR',
    signature_data: '',
    file_url: '',
    total: '0',
  });

  useEffect(() => {
    if (isEdit) {
      loadReceipt();
    } else {
      const scanned_issuer = searchParams.get('issuer_name');
      const file_url_param = searchParams.get('file_url');
      if (file_url_param && !scanned_issuer) {
        setFormData(prev => ({ ...prev, file_url: file_url_param }));
      } else if (scanned_issuer !== null) {
        const scanned_date = searchParams.get('date') || new Date().toISOString().split('T')[0];
        const scanned_gross = searchParams.get('amount_gross') || '';
        const scanned_net = searchParams.get('amount_net') || '';
        const scanned_vat = searchParams.get('vat_amount') || '';
        const scanned_payment = searchParams.get('payment_method') || 'Bar';
        const scanned_items = searchParams.get('items') || '';
        const scanned_file_url = searchParams.get('file_url') || '';
        const scanned_receipt_number = searchParams.get('receipt_number') || '';

        const grossVal = parseFloat(scanned_gross) || 0;
        const netVal = parseFloat(scanned_net) || 0;
        const vatVal = parseFloat(scanned_vat) || 0;
        const hasVat = netVal > 0 && vatVal > 0 && netVal < grossVal;

        // Detect VAT rate from net/gross if available
        let detectedVatRate = '19';
        if (hasVat && netVal > 0) {
          const impliedRate = Math.round(((grossVal / netVal) - 1) * 100);
          const knownRates = [0, 7, 10, 19, 20, 21, 23, 25];
          const closest = knownRates.reduce((a, b) => Math.abs(b - impliedRate) < Math.abs(a - impliedRate) ? b : a, 19);
          detectedVatRate = closest.toString();
        }

        // Match payment method to known list
        const matchPayment = (raw: string): string => {
          const normalised = raw.toLowerCase().trim();
          for (const m of PAYMENT_METHODS) {
            if (m.toLowerCase() === normalised) return m;
          }
          return PAYMENT_METHODS.includes(raw) ? raw : 'Bar';
        };

        setFormData(prev => ({
          ...prev,
          store_name: scanned_issuer,
          date: scanned_date,
          amount_gross: scanned_gross,
          total: scanned_gross,
          amount_net: hasVat ? scanned_net : scanned_gross,
          vat_amount: hasVat ? scanned_vat : '0.00',
          vat_rate: hasVat ? detectedVatRate : '19',
          vat_enabled: hasVat,
          payment_method: matchPayment(scanned_payment),
          items: scanned_items,
          file_url: scanned_file_url,
          receipt_number: scanned_receipt_number,
        }));
      }
    }
  }, [id]);

  const loadReceipt = async () => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (data) {
        const gross = data.amount_gross || data.total || 0;
        const net = data.amount_net || 0;
        const vatAmt = data.vat_amount || 0;
        setFormData({
          receipt_number: data.receipt_number || '',
          date: data.date || new Date().toISOString().split('T')[0],
          store_name: data.store_name || data.issuer_name || '',
          items: data.items || '',
          payment_method: data.payment_method || 'Bar',
          vat_enabled: data.vat_enabled || false,
          amount_net: net ? net.toString() : '',
          vat_rate: data.vat_rate?.toString() || '19',
          vat_amount: vatAmt ? vatAmt.toFixed(2) : '0.00',
          amount_gross: gross ? gross.toString() : '',
          currency: data.currency || 'EUR',
          signature_data: data.signature_data || '',
          file_url: data.file_url || '',
          total: gross ? gross.toString() : '0',
        });
      }
    } catch (error) {
      console.error('Error loading receipt:', error);
    }
  };

  const recalcVat = (net: string, rate: string): { vat: string; gross: string } => {
    const n = parseFloat(net) || 0;
    const r = parseFloat(rate) || 0;
    const vat = (n * r) / 100;
    return { vat: vat.toFixed(2), gross: (n + vat).toFixed(2) };
  };

  const handleAmountChange = (field: 'amount_net' | 'amount_gross' | 'vat_rate', value: string) => {
    if (!formData.vat_enabled) {
      setFormData(prev => ({ ...prev, [field]: value, amount_gross: value, total: value, amount_net: value, vat_amount: '0.00' }));
      return;
    }
    if (field === 'amount_gross') {
      const g = parseFloat(value) || 0;
      const r = parseFloat(formData.vat_rate) || 0;
      const net = r > 0 ? (g / (1 + r / 100)).toFixed(2) : g.toFixed(2);
      const vat = r > 0 ? (g - parseFloat(net)).toFixed(2) : '0.00';
      setFormData(prev => ({ ...prev, amount_gross: value, total: value, amount_net: net, vat_amount: vat }));
    } else if (field === 'amount_net') {
      const { vat, gross } = recalcVat(value, formData.vat_rate);
      setFormData(prev => ({ ...prev, amount_net: value, vat_amount: vat, amount_gross: gross, total: gross }));
    } else if (field === 'vat_rate') {
      const { vat, gross } = recalcVat(formData.amount_net, value);
      setFormData(prev => ({ ...prev, vat_rate: value, vat_amount: vat, amount_gross: gross, total: gross }));
    }
  };

  const handleVatToggle = (enabled: boolean) => {
    if (!enabled) {
      setFormData(prev => ({
        ...prev,
        vat_enabled: false,
        vat_amount: '0.00',
        amount_net: prev.amount_gross,
        total: prev.amount_gross,
      }));
    } else {
      const { vat, gross } = recalcVat(formData.amount_net || formData.amount_gross, formData.vat_rate);
      setFormData(prev => ({ ...prev, vat_enabled: true, vat_amount: vat, amount_gross: gross, total: gross }));
    }
  };

  const buildReceiptData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const gross = parseFloat(formData.amount_gross) || parseFloat(formData.total) || 0;
    return {
      user_id: user.id,
      store_name: formData.store_name || '',
      issuer_name: formData.store_name || '',
      date: formData.date || null,
      total: gross,
      amount_gross: gross,
      amount_net: parseFloat(formData.amount_net) || 0,
      vat_rate: parseFloat(formData.vat_rate) || 0,
      vat_amount: parseFloat(formData.vat_amount) || 0,
      vat_enabled: formData.vat_enabled,
      currency: formData.currency,
      items: formData.items,
      payment_method: formData.payment_method,
      receipt_number: formData.receipt_number,
      signature_data: formData.signature_data,
      file_url: formData.file_url,
      updated_at: new Date().toISOString(),
    };
  }, [formData]);

  const hasSignificantData = useCallback(() => {
    return !!(formData.store_name.trim() || formData.amount_gross || formData.items.trim());
  }, [formData]);

  const performAutosave = useCallback(async () => {
    if (!hasSignificantData()) return;
    if (isSavedManuallyRef.current) return;
    try {
      setAutosaveStatus('saving');
      const receiptData = await buildReceiptData();
      if (!receiptData) return;

      if (isEdit) {
        await supabase.from('receipts').update(receiptData).eq('id', id);
      } else if (autosaveIdRef.current) {
        await supabase.from('receipts').update(receiptData).eq('id', autosaveIdRef.current);
      } else {
        const { data: newReceipt } = await supabase
          .from('receipts')
          .insert([receiptData])
          .select()
          .maybeSingle();
        if (newReceipt) {
          autosaveIdRef.current = newReceipt.id;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      setAutosaveStatus('saved');
      setTimeout(() => setAutosaveStatus('idle'), 2000);
    } catch {
      setAutosaveStatus('idle');
    }
  }, [formData, isEdit, id, hasSignificantData, buildReceiptData, queryClient]);

  useEffect(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      if (!isSavedManuallyRef.current) performAutosave();
    }, 2000);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  }, [formData, performAutosave]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    isSavedManuallyRef.current = true;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/unlock'); return; }

      const gross = parseFloat(formData.amount_gross) || parseFloat(formData.total) || 0;
      const receiptData = {
        user_id: user.id,
        store_name: formData.store_name || '',
        issuer_name: formData.store_name || '',
        date: formData.date || null,
        total: gross,
        amount_gross: gross,
        amount_net: parseFloat(formData.amount_net) || 0,
        vat_rate: parseFloat(formData.vat_rate) || 0,
        vat_amount: parseFloat(formData.vat_amount) || 0,
        vat_enabled: formData.vat_enabled,
        currency: formData.currency,
        items: formData.items,
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number,
        signature_data: formData.signature_data,
        file_url: formData.file_url,
        updated_at: new Date().toISOString(),
      };

      const existingId = isEdit ? id : autosaveIdRef.current;
      if (existingId) {
        const { error } = await supabase.from('receipts').update(receiptData).eq('id', existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('receipts').insert([receiptData]);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      navigate('/receipts');
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert(t('errorSavingReceipt'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/unlock'); return; }
    if (file.size > 10 * 1024 * 1024) { alert(t('fileSizeLimit10mb')); return; }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('scanned-documents').upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('scanned-documents').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, file_url: publicUrl }));
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async () => {
    if (!formData.file_url) return;
    try {
      const fileName = formData.file_url.split('/').pop();
      const { data: { user } } = await supabase.auth.getUser();
      if (fileName && user) {
        await supabase.storage.from('scanned-documents').remove([`${user.id}/${fileName}`]);
      }
      setFormData(prev => ({ ...prev, file_url: '' }));
    } catch (error) {
      console.error('Remove error:', error);
    }
  };

  const sym = formatCurrencySymbol(formData.currency);
  const canSave = formData.store_name.trim() && (formData.amount_gross || formData.total);
  const [showOriginalImage, setShowOriginalImage] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const isImageUrl = formData.file_url && /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/i.test(formData.file_url);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const gross = parseFloat(formData.amount_gross) || parseFloat(formData.total) || 0;
      await downloadReceiptPDF({
        id: id || 'new',
        store_name: formData.store_name,
        date: formData.date,
        total: gross,
        items: formData.items,
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number,
        file_url: formData.file_url,
        issuer_name: formData.store_name,
        amount_net: parseFloat(formData.amount_net) || 0,
        vat_rate: parseFloat(formData.vat_rate) || 0,
        vat_amount: parseFloat(formData.vat_amount) || 0,
        amount_gross: gross,
        vat_enabled: formData.vat_enabled,
        currency: formData.currency,
        signature_data: formData.signature_data,
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1f24] text-white pb-24 pt-20">
      <TopNav />

      <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-xl mx-auto">

        <div className="flex items-center gap-3 mb-2">
          <button type="button" onClick={() => navigate('/receipts')} className="p-2 rounded-xl bg-white/8 hover:bg-white/15 transition-all">
            <ArrowLeft size={18} className="text-white/70" />
          </button>
          <h1 className="text-xl font-semibold text-white flex-1">
            {isEdit ? t('editReceipt') : t('newReceipt')}
          </h1>
          {autosaveStatus === 'saving' && (
            <span className="text-white/40 text-xs">{t('saving') || 'Збереження...'}</span>
          )}
          {autosaveStatus === 'saved' && (
            <span className="text-green-400/70 text-xs">{t('saved') || 'Збережено'}</span>
          )}
          {isEdit && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/8 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/30 text-white/60 hover:text-orange-400 transition-all text-sm font-medium disabled:opacity-50"
            >
              <Download size={15} />
              PDF
            </button>
          )}
        </div>

        {isImageUrl ? (
          <div className="bg-white/6 border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <FileImage size={15} className="text-orange-400" />
                <span className="text-sm font-medium text-white/80">Original-Beleg</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowOriginalImage(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/60 hover:text-white text-xs font-medium transition-all"
                >
                  <ZoomIn size={13} />
                  Vergrößern
                </button>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-400 transition-all"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            <div
              className="cursor-pointer group relative overflow-hidden"
              style={{ maxHeight: 340 }}
              onClick={() => setShowOriginalImage(true)}
            >
              <img
                src={formData.file_url}
                alt="Receipt"
                className="w-full object-contain bg-white"
                style={{ maxHeight: 340 }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full">
                  <ZoomIn size={16} className="text-white" />
                  <span className="text-white text-sm font-medium">Original ansehen</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/6 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileImage size={15} className="text-white/40" />
                <span className="text-sm text-white/50">Kein Beleg angehängt</span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-orange-500/15 border border-white/10 hover:border-orange-500/30 text-white/60 hover:text-orange-400 text-xs font-medium transition-all disabled:opacity-50"
              >
                <Upload size={13} />
                {uploading ? 'Lädt...' : 'Hochladen'}
              </button>
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />

        <div className="bg-white/6 border border-white/10 rounded-2xl overflow-hidden">

          <div className="px-5 pt-5 pb-4 border-b border-white/8">
            <p className="text-xs uppercase tracking-wider text-white/40 font-medium mb-3">{t('basicInfo')}</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('date')}
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
              <Input
                label={t('receiptNumberLabel')}
                value={formData.receipt_number}
                onChange={(e) => setFormData(prev => ({ ...prev, receipt_number: e.target.value }))}
                placeholder="001"
              />
            </div>
          </div>

          <div className="px-5 py-4 border-b border-white/8">
            <p className="text-xs uppercase tracking-wider text-white/40 font-medium mb-3">{t('storeSupplier')}</p>
            <Input
              label={`${t('storeSupplier')} *`}
              value={formData.store_name}
              onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
              placeholder={t('storePlaceholder')}
              required
            />
          </div>

          <div className="px-5 py-4 border-b border-white/8">
            <p className="text-xs uppercase tracking-wider text-white/40 font-medium mb-3">{t('itemsDescription')}</p>
            <Textarea
              label={t('itemsDescription')}
              value={formData.items}
              onChange={(e) => setFormData(prev => ({ ...prev, items: e.target.value }))}
              placeholder={t('itemsPlaceholder')}
              rows={3}
            />
          </div>

          <div className="px-5 py-4 border-b border-white/8">
            <p className="text-xs uppercase tracking-wider text-white/40 font-medium mb-3">{t('amount')} & {t('currency') || 'Währung'}</p>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Input
                    label={formData.vat_enabled ? (t('amountNet') || 'Netto') : (t('amount') || 'Betrag')}
                    type="number"
                    step="0.01"
                    value={formData.vat_enabled ? formData.amount_net : formData.amount_gross}
                    onChange={(e) => formData.vat_enabled ? handleAmountChange('amount_net', e.target.value) : handleAmountChange('amount_gross', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <Select
                  label={t('currency') || 'Währung'}
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  options={CURRENCIES.map(c => ({ value: c, label: c }))}
                />
              </div>

              <div className="flex items-center gap-3 py-1">
                <button
                  type="button"
                  onClick={() => handleVatToggle(!formData.vat_enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${formData.vat_enabled ? 'bg-orange-500' : 'bg-white/15'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.vat_enabled ? 'translate-x-5.5 left-0.5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm text-white/70">{t('enableVat') || 'MwSt.'}</span>
              </div>

              {formData.vat_enabled && (
                <div className="bg-white/4 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label={t('vatPercent') || 'MwSt. %'}
                      value={formData.vat_rate}
                      onChange={(e) => handleAmountChange('vat_rate', e.target.value)}
                      options={VAT_RATES.map(r => ({ value: r, label: `${r} %` }))}
                    />
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">{t('vatAmount') || 'MwSt.'}</label>
                      <div className="w-full bg-white/5 border border-white/10 rounded-xl text-white/60 py-3 px-4 text-sm">
                        {formData.vat_amount} {sym}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-white/10">
                    <span className="text-sm font-semibold text-white/80">{t('grossTotal') || 'Brutto'}</span>
                    <span className="text-lg font-bold text-orange-400">
                      {parseFloat(formData.amount_gross || '0').toFixed(2)} {sym}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-5 py-4 border-b border-white/8">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t('paymentMethod')}
                value={formData.payment_method}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))}
              />
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">{t('totalAmount')}</label>
                <div className="w-full bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 font-bold py-3 px-4 text-sm">
                  {parseFloat(formData.amount_gross || formData.total || '0').toFixed(2)} {sym}
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/receipts')}
            className="flex-1 py-3 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white transition-all font-medium"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={loading || !canSave}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-all active:scale-95 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? (t('saving') || '...') : t('save')}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showOriginalImage && formData.file_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black flex flex-col"
            onClick={() => setShowOriginalImage(false)}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-black/90 border-b border-white/5" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowOriginalImage(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all">
                <X size={20} className="text-white" />
              </button>
              <span className="text-white/70 text-sm font-medium">Original-Beleg</span>
              <div className="w-10" />
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-start justify-center" onClick={e => e.stopPropagation()}>
              <img src={formData.file_url} alt="Original receipt" className="max-w-full rounded-lg shadow-2xl" style={{ minWidth: '100%', objectFit: 'contain' }} />
            </div>
            <div className="p-3 bg-black/90 border-t border-white/5">
              <p className="text-white/30 text-xs text-center">Antippen zum Schließen</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
