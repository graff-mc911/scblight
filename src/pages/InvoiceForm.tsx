import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Eye, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { InvoicePreview } from '../components/InvoicePreview';
import { supabase } from '../lib/supabase';
import { currencies, units, statuses } from '../lib/languages';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';
import { safeEval } from '../lib/calculator';

interface InvoiceItem {
  quantity: number;
  quantityDisplay: string;
  unit: string;
  price: number;
  material: string;
  description: string;
  total: number;
}

export const InvoiceForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const { showSuccess, showError } = useToastContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // --------------------------------------------------
  // Клієнти та профіль компанії
  // --------------------------------------------------
  const [clients, setClients] = useState<any[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);

  // --------------------------------------------------
  // Основні дані інвойсу
  // --------------------------------------------------
  const [formData, setFormData] = useState({
    client_id: '',
    document_number: '',
    date: new Date().toISOString().split('T')[0],
    work_period_start: new Date().toISOString().split('T')[0],
    work_period_end: new Date().toISOString().split('T')[0],
    currency: 'EUR',
    status: 'draft',
    vat_enabled: false,
    vat_rate: 20,
    document_type: 'invoice',
    project_area: '',
    object_address: '',
    notes: '',
  });

  // --------------------------------------------------
  // Позиції інвойсу
  // --------------------------------------------------
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      quantity: 0,
      quantityDisplay: '',
      unit: 'm²',
      price: 0,
      material: '',
      description: '',
      total: 0,
    },
  ]);

  useEffect(() => {
    void init();
  }, [id]);

  // --------------------------------------------------
  // Початкове завантаження
  // --------------------------------------------------
  const init = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchClients(), fetchCompanyProfile()]);

      if (id) {
        await fetchInvoice();
      } else {
        await generateDocumentNumber();
      }
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Завантаження клієнтів
  // --------------------------------------------------
  const fetchClients = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (!error && data) {
      setClients(data);
    }
  };

  // --------------------------------------------------
  // Завантаження профілю компанії
  // --------------------------------------------------
  const fetchCompanyProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from('company_profile')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error) {
      setCompanyProfile(data || null);
    }
  };

  // --------------------------------------------------
  // Генерація номера документа
  // --------------------------------------------------
  const generateDocumentNumber = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from('invoices')
      .select('document_no')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNumber = 1;

    if (data?.document_no) {
      const match = data.document_no.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    const year = new Date().getFullYear();
    const docNumber = `INV-${year}-${String(nextNumber).padStart(4, '0')}`;

    setFormData((prev) => ({
      ...prev,
      document_number: docNumber,
    }));
  };

  // --------------------------------------------------
  // Завантаження існуючого інвойсу
  // --------------------------------------------------
  const fetchInvoice = async () => {
    const { data: invoiceData, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !invoiceData) {
      showError(t('errorLoadingInvoice') || 'Error loading invoice');
      return;
    }

    setFormData({
      client_id: invoiceData.client_id || '',
      document_number: invoiceData.document_no || '',
      date: invoiceData.date || new Date().toISOString().split('T')[0],
      work_period_start:
        invoiceData.work_period_start ||
        invoiceData.date ||
        new Date().toISOString().split('T')[0],
      work_period_end:
        invoiceData.work_period_end ||
        invoiceData.date ||
        new Date().toISOString().split('T')[0],
      currency: invoiceData.currency || 'EUR',
      status: invoiceData.status || 'draft',
      vat_enabled: (invoiceData.tax_percent || 0) > 0,
      vat_rate: invoiceData.tax_percent || 20,
      document_type: invoiceData.document_type || 'invoice',
      project_area: invoiceData.total_project_area?.toString() || '',
      object_address: invoiceData.object_address || '',
      notes: invoiceData.notes || '',
    });

    const { data: itemsData } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order');

    if (itemsData && itemsData.length > 0) {
      setItems(
        itemsData.map((item) => ({
          quantity: Number(item.quantity),
          quantityDisplay: String(item.quantity),
          unit: item.unit || 'm²',
          price: Number(item.price),
          material: item.material || '',
          description: item.description || '',
          total: Number(item.total),
        }))
      );
    }
  };

  // --------------------------------------------------
  // Зміна полів позиції
  // --------------------------------------------------
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };

      if (field === 'quantity' || field === 'price') {
        const qty = field === 'quantity' ? Number(value) : Number(updated.quantity);
        const price = field === 'price' ? Number(value) : Number(updated.price);
        updated.total = qty * price;

        if (field === 'quantity') {
          updated.quantityDisplay = String(value);
        }
      }

      next[index] = updated;
      return next;
    });
  };

  // --------------------------------------------------
  // Калькулятор для кількості
  // --------------------------------------------------
  const handleQuantityChange = (index: number, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        quantityDisplay: value,
      };
      return next;
    });
  };

  const handleQuantityBlur = (index: number) => {
    const item = items[index];
    const result = safeEval(item.quantityDisplay);

    if (!isNaN(result)) {
      handleItemChange(index, 'quantity', result);
    } else {
      handleItemChange(index, 'quantity', 0);
    }
  };

  // --------------------------------------------------
  // Додати / видалити позицію
  // --------------------------------------------------
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        quantity: 0,
        quantityDisplay: '',
        unit: 'm²',
        price: 0,
        material: '',
        description: '',
        total: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  // --------------------------------------------------
  // Підсумки
  // --------------------------------------------------
  const netTotal = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);

  const vatAmount = useMemo(
    () => (formData.vat_enabled ? (netTotal * formData.vat_rate) / 100 : 0),
    [formData.vat_enabled, formData.vat_rate, netTotal]
  );

  const grossTotal = useMemo(() => netTotal + vatAmount, [netTotal, vatAmount]);

  const formatCurrency = (amount: number) => amount.toFixed(2);

  // --------------------------------------------------
  // Збереження інвойсу
  // --------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showError(t('notAuthenticated') || 'Not authenticated');
        return;
      }

      const selectedClient = clients.find((c) => c.id === formData.client_id);

      const totalProjectArea = formData.project_area ? parseFloat(formData.project_area) : 0;
      const totalAreaNet = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalAreaGross = totalAreaNet;

      // --------------------------------------------------
      // Тут додаємо ВСІ потрібні дані компанії
      // щоб вони залишилися в ЗБЕРЕЖЕНОМУ інвойсі
      // --------------------------------------------------
      const invoicePayload = {
        user_id: user.id,
        client_id: formData.client_id || null,
        client_name: selectedClient?.name || '',
        client_number: selectedClient?.client_number || null,
        document_no: formData.document_number,
        date: formData.date,
        work_period_start: formData.work_period_start,
        work_period_end: formData.work_period_end,
        currency: formData.currency,
        status: formData.status,
        document_type: formData.document_type,
        object_address: formData.object_address || null,
        notes: formData.notes || null,

        total_net: netTotal,
        tax_percent: formData.vat_enabled ? formData.vat_rate : 0,
        tax_amount: vatAmount,
        total_gross: grossTotal,
        total_project_area: totalProjectArea || null,
        total_area_net: totalAreaNet || null,
        total_area_gross: totalAreaGross || null,

        // --------------------------------------------------
        // Дані виконавця / компанії
        // --------------------------------------------------
        executor_name: companyProfile?.company_name || null,
        executor_logo_url: companyProfile?.logo_url || null,
        executor_address: companyProfile?.address || null,
        executor_phone: companyProfile?.phone || null,
        executor_email: companyProfile?.email || null,
        executor_bank: companyProfile?.bank_name || null,
        executor_iban: companyProfile?.iban || null,
        executor_bic: companyProfile?.bic || null,
        executor_tax_number: companyProfile?.tax_number || null,
      };

      let invoiceId = id;

      if (id) {
        const { error } = await supabase
          .from('invoices')
          .update(invoicePayload)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('invoices')
          .insert([invoicePayload])
          .select()
          .maybeSingle();

        if (error) throw error;
        invoiceId = data?.id;
      }

      if (!invoiceId) {
        throw new Error('Failed to get invoice ID');
      }

      // --------------------------------------------------
      // Видаляємо старі позиції
      // --------------------------------------------------
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);

      // --------------------------------------------------
      // Додаємо нові позиції
      // --------------------------------------------------
      if (items.length > 0) {
        const itemsPayload = items.map((item, index) => ({
          invoice_id: invoiceId,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          material: item.material,
          description: item.description || '',
          total: item.total,
          sort_order: index,
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsPayload);

        if (itemsError) throw itemsError;
      }

      await queryClient.invalidateQueries({ queryKey: ['invoices'] });

      showSuccess(
        id
          ? (t('invoiceUpdated') || 'Invoice updated')
          : (t('invoiceCreated') || 'Invoice created')
      );

      navigate(`/invoices/${invoiceId}/view`);
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      showError(error?.message || t('errorSavingInvoice') || 'Error saving invoice');
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // Лоадер
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="flex items-center justify-center p-2 bg-white/10 backdrop-blur-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl mb-4 transition-all active:scale-95"
          title={t('back')}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">
              {id ? t('editInvoice') : t('newInvoice')}
            </h2>
            <p className="text-white/60 text-sm">
              {id ? t('updateInvoiceInfo') : t('createNewInvoice')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* --------------------------------------------------
            Основні дані документа
        -------------------------------------------------- */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={t('client')}
              options={[
                { value: '', label: t('chooseClient') },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
            />

            <Input
              label={t('documentNumber')}
              value={formData.document_number}
              onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
            />

            <Input
              label={t('date')}
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />

            <Input
              label={t('workPeriodStart')}
              type="date"
              value={formData.work_period_start}
              onChange={(e) => setFormData({ ...formData, work_period_start: e.target.value })}
            />

            <Input
              label={t('workPeriodEnd')}
              type="date"
              value={formData.work_period_end}
              onChange={(e) => setFormData({ ...formData, work_period_end: e.target.value })}
            />

            <Select
              label={t('currency')}
              options={currencies.map((c) => ({
                value: c.code,
                label: `${c.code} (${c.symbol})`,
              }))}
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            />

            <Select
              label={t('documentType')}
              options={[
                { value: 'invoice', label: t('invoiceDocType') },
                { value: 'proposal', label: t('proposalType') },
                { value: 'estimate', label: t('estimateType') },
              ]}
              value={formData.document_type}
              onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
            />

            <Select
              label={t('status')}
              options={statuses.map((s) => ({ value: s.value, label: t(s.value) }))}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            />
          </div>
        </div>

        {/* --------------------------------------------------
            Позиції
        -------------------------------------------------- */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-white text-lg">{t('positions')}</h2>

            <Button type="button" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">{t('addPosition')}</span>
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="mb-3">
                  <Input
                    label={t('description')}
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-white/70">
                      {t('quantity')}
                    </label>
                    <Input
                      type="text"
                      value={item.quantityDisplay}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      onBlur={() => handleQuantityBlur(index)}
                      placeholder={t('calculatorPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-white/70">
                      {t('unit')}
                    </label>
                    <Select
                      options={units}
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-white/70">
                      {t('price')}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.price || ''}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-white/70">
                      {t('material')}
                    </label>
                    <Input
                      value={item.material}
                      onChange={(e) => handleItemChange(index, 'material', e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2 flex gap-2">
                    <div className="flex-1">
                      <label className="block mb-1.5 text-sm font-medium text-white/70">
                        {t('totalAmount')}
                      </label>
                      <Input value={item.total ? formatCurrency(item.total) : ''} disabled />
                    </div>

                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="mt-auto text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --------------------------------------------------
            ПДВ і підсумки
        -------------------------------------------------- */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.vat_enabled}
                  onChange={(e) => setFormData({ ...formData, vat_enabled: e.target.checked })}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-white">
                  {t('enableVat')} ({formData.vat_rate}%)
                </span>
              </label>

              {formData.vat_enabled && (
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-sm">{t('vatPercent')}</span>
                  <Input
                    type="number"
                    value={formData.vat_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, vat_rate: Number(e.target.value) })
                    }
                    className="w-20"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-white/60">{t('netAmount')}</span>
                <span className="font-medium text-white">
                  {formatCurrency(netTotal)} {formData.currency}
                </span>
              </div>

              {formData.vat_enabled && (
                <div className="flex justify-between items-center">
                  <span className="text-white/60">
                    {t('vat')} ({formData.vat_rate}%)
                  </span>
                  <span className="font-medium text-white">
                    {formatCurrency(vatAmount)} {formData.currency}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="font-semibold text-white text-lg">{t('grossAmount')}</span>
                <span className="text-2xl font-bold text-orange-400">
                  {formatCurrency(grossTotal)} {formData.currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------
            Додаткові поля
        -------------------------------------------------- */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <Input
            label={t('projectArea')}
            value={formData.project_area}
            onChange={(e) => setFormData({ ...formData, project_area: e.target.value })}
            className="mb-4"
          />

          <Input
            label={t('objectAddress') || "BVH (адреса об'єкта)"}
            placeholder="Robert-Bosch-Straße 7a, 63303 Dreieich"
            value={formData.object_address}
            onChange={(e) => setFormData({ ...formData, object_address: e.target.value })}
            className="mb-4"
          />

          <Textarea
            label={t('notes')}
            placeholder={t('additionalNotes')}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
          />
        </div>

        {/* --------------------------------------------------
            Кнопки
        -------------------------------------------------- */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-gray-300 hover:text-white transition-all active:scale-95"
            title={t('back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-blue-400 transition-all active:scale-95"
            title={t('preview')}
          >
            <Eye className="h-4 w-4" />
          </button>

          <button
            type="submit"
            disabled={saving}
            className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all active:scale-95 disabled:opacity-60"
            title={t('save')}
          >
            <Save className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* --------------------------------------------------
          Preview
      -------------------------------------------------- */}
      {isPreviewOpen && (
        <InvoicePreview
          invoice={{
            document_number: formData.document_number,
            date: formData.date,
            work_period_start: formData.work_period_start,
            work_period_end: formData.work_period_end,
            client_number: clients.find((c) => c.id === formData.client_id)?.client_number || '',
            currency: formData.currency,
            items,
            vat_enabled: formData.vat_enabled,
            vat_rate: formData.vat_rate,
            object_address: formData.object_address,
            notes: formData.notes,
            invoice_language: language,

            // --------------------------------------------------
            // Передаємо також збережені дані компанії
            // --------------------------------------------------
            executor_name: companyProfile?.company_name || '',
            executor_logo_url: companyProfile?.logo_url || '',
            executor_address: companyProfile?.address || '',
            executor_phone: companyProfile?.phone || '',
            executor_email: companyProfile?.email || '',
            executor_bank: companyProfile?.bank_name || '',
            executor_iban: companyProfile?.iban || '',
            executor_bic: companyProfile?.bic || '',
            executor_tax_number: companyProfile?.tax_number || '',
          }}
          client={clients.find((c) => c.id === formData.client_id)}
          companyProfile={companyProfile}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
};