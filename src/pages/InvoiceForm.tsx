import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Upload, FileText, Download, Eye, Save } from 'lucide-react';
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
import { generateInvoicePDFBlob } from '../lib/pdfGenerator';

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

  const [clients, setClients] = useState<any[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const autosaveIdRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout>();
  const isSavedManuallyRef = useRef(false);

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
    fetchClients();
    fetchCompanyProfile();

    if (id) {
      fetchInvoice();
    } else {
      generateDocumentNumber();
    }
  }, [id]);

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
    setFormData((prev) => ({ ...prev, document_number: docNumber }));
  };

  const fetchClients = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (data) setClients(data);
  };

  const fetchCompanyProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from('company_profile')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) setCompanyProfile(data);
  };

  const fetchInvoice = async () => {
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!invoiceData) return;

    setFormData({
      client_id: invoiceData.client_id || '',
      document_number: invoiceData.document_no || '',
      date: invoiceData.date,
      work_period_start: invoiceData.work_period_start || invoiceData.date,
      work_period_end: invoiceData.work_period_end || invoiceData.date,
      currency: invoiceData.currency,
      status: invoiceData.status,
      vat_enabled: invoiceData.tax_percent > 0,
      vat_rate: invoiceData.tax_percent || 20,
      document_type: invoiceData.document_type || 'invoice',
      project_area: invoiceData.total_project_area?.toString() || '',
      object_address: invoiceData.object_address || '',
      notes: invoiceData.notes || '',
    });

    setAttachedFile(invoiceData.attached_file_url || null);

    const { data: itemsData } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order');

    if (itemsData && itemsData.length > 0) {
      setItems(
        itemsData.map((item) => ({
          quantity: Number(item.quantity),
          quantityDisplay: item.quantity.toString(),
          unit: item.unit,
          price: Number(item.price),
          material: item.material,
          description: item.description || '',
          total: Number(item.total),
        }))
      );
    }
  };

  const hasSignificantData = useCallback(() => {
    const hasClient = !!formData.client_id;
    const hasAddress = !!formData.object_address.trim();
    const hasNotes = !!formData.notes.trim();
    const hasItems = items.some(
      (item) =>
        item.description.trim() || item.material.trim() || item.price > 0 || item.quantity > 0
    );

    return hasClient || hasAddress || hasNotes || hasItems;
  }, [formData, items]);

  const performAutosave = useCallback(async () => {
    if (!hasSignificantData()) return;
    if (isSavedManuallyRef.current) return;

    try {
      setAutosaveStatus('saving');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const selectedClient = clients.find((c) => c.id === formData.client_id);
      const netTotal = items.reduce((sum, item) => sum + item.total, 0);
      const vatAmount = formData.vat_enabled ? (netTotal * formData.vat_rate) / 100 : 0;
      const grossTotal = netTotal + vatAmount;

      const invoiceData = {
        user_id: user.id,
        client_id: formData.client_id || null,
        client_name: selectedClient?.name || '',
        client_number: selectedClient?.client_number || null,
        document_no: formData.document_number,
        date: formData.date,
        work_period_start: formData.work_period_start,
        work_period_end: formData.work_period_end,
        currency: formData.currency,
        status: 'draft',
        document_type: formData.document_type,
        object_address: formData.object_address || null,
        notes: formData.notes || null,
        total_net: netTotal,
        tax_percent: formData.vat_enabled ? formData.vat_rate : 0,
        tax_amount: vatAmount,
        total_gross: grossTotal,
      };

      if (autosaveIdRef.current) {
        await supabase.from('invoices').update(invoiceData).eq('id', autosaveIdRef.current);

        if (items.length > 0) {
          await supabase.from('invoice_items').delete().eq('invoice_id', autosaveIdRef.current);
          await supabase.from('invoice_items').insert(
            items.map((item, index) => ({
              invoice_id: autosaveIdRef.current,
              quantity: item.quantity,
              unit: item.unit,
              price: item.price,
              material: item.material,
              description: item.description || '',
              total: item.total,
              sort_order: index,
            }))
          );
        }
      } else {
        const { data: newInvoice } = await supabase
          .from('invoices')
          .insert([invoiceData])
          .select()
          .maybeSingle();

        if (newInvoice) {
          autosaveIdRef.current = newInvoice.id;
          navigate(`/invoices/${newInvoice.id}`, { replace: true });

          if (items.length > 0) {
            await supabase.from('invoice_items').insert(
              items.map((item, index) => ({
                invoice_id: newInvoice.id,
                quantity: item.quantity,
                unit: item.unit,
                price: item.price,
                material: item.material,
                description: item.description || '',
                total: item.total,
                sort_order: index,
              }))
            );
          }
        }
      }

      setAutosaveStatus('saved');
      setTimeout(() => setAutosaveStatus('idle'), 2000);
    } catch {
      setAutosaveStatus('idle');
    }
  }, [clients, formData, hasSignificantData, items, navigate]);

  useEffect(() => {
    if (id) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      performAutosave();
    }, 2000);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [formData, items, id, performAutosave]);

  const performAutosaveForExisting = useCallback(async () => {
    if (!id) return;

    try {
      setAutosaveStatus('saving');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const selectedClient = clients.find((c) => c.id === formData.client_id);
      const netTotal = items.reduce((sum, item) => sum + item.total, 0);
      const vatAmount = formData.vat_enabled ? (netTotal * formData.vat_rate) / 100 : 0;
      const grossTotal = netTotal + vatAmount;

      await supabase
        .from('invoices')
        .update({
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
        })
        .eq('id', id);

      await supabase.from('invoice_items').delete().eq('invoice_id', id);

      if (items.length > 0) {
        await supabase.from('invoice_items').insert(
          items.map((item, index) => ({
            invoice_id: id,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            material: item.material,
            description: item.description || '',
            total: item.total,
            sort_order: index,
          }))
        );
      }

      setAutosaveStatus('saved');
      setTimeout(() => setAutosaveStatus('idle'), 2000);
    } catch {
      setAutosaveStatus('idle');
    }
  }, [clients, formData, id, items]);

  useEffect(() => {
    if (!id) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      if (isSavedManuallyRef.current) return;
      performAutosaveForExisting();
    }, 2000);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [formData, items, id, performAutosaveForExisting]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showError(t('fileSizeLimit10mb') || 'File size must be less than 10MB');
      return;
    }

    if (!id) {
      showError(t('saveInvoiceFirst') || 'Please save the invoice first before uploading files');
      return;
    }

    setUploadingFile(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${id}-attachment-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('invoice-pdfs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('invoice-pdfs').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ attached_file_url: publicUrl })
        .eq('id', id);

      if (updateError) throw updateError;

      setAttachedFile(publicUrl);
      showSuccess(t('fileUploaded') || 'File uploaded successfully');
    } catch {
      showError(t('failedUploadFile') || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!attachedFile || !id) return;

    try {
      const fileName = attachedFile.split('/').pop();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const filePath = `${user.id}/${fileName}`;

      const { error: deleteError } = await supabase.storage
        .from('invoice-pdfs')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ attached_file_url: null })
        .eq('id', id);

      if (updateError) throw updateError;

      setAttachedFile(null);
      showSuccess(t('fileDeleted') || 'File deleted successfully');
    } catch {
      showError(t('failedDeleteFile') || 'Failed to delete file');
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'price') {
      const qty = field === 'quantity' ? Number(value) : newItems[index].quantity;
      const price = field === 'price' ? Number(value) : newItems[index].price;
      newItems[index].total = qty * price;

      if (field === 'quantity') {
        newItems[index].quantityDisplay = value.toString();
      }
    }

    setItems(newItems);
  };

  const handleQuantityChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index].quantityDisplay = value;
    setItems(newItems);
  };

  const generateAndSavePDF = async (
    invoiceId: string,
    invoiceData: any,
    invoiceItems: InvoiceItem[]
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const selectedClient = clients.find((c) => c.id === formData.client_id);

    const pdfInvoiceData = {
      document_number: invoiceData.document_no,
      date: invoiceData.date,
      client_name: invoiceData.client_name,
      client_address: selectedClient?.address || '',
      client_tax_number: selectedClient?.tax_number || '',
      client_number: invoiceData.client_number,
      currency: invoiceData.currency,
      items: invoiceItems.map((item) => ({
        description: item.description || item.material || '',
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        total: item.total,
      })),
      vat_enabled: formData.vat_enabled,
      vat_rate: formData.vat_rate,
      notes: invoiceData.notes,
      service_period_start: invoiceData.work_period_start,
      service_period_end: invoiceData.work_period_end,
      object_address: formData.object_address || '',
      invoice_language: language,
    };

    const companyData = {
      company_name: companyProfile?.company_name || '',
      company_address: companyProfile?.address || '',
      company_phone: companyProfile?.phone || '',
      company_email: companyProfile?.email || '',
      company_tax_number: companyProfile?.tax_number || '',
      company_bank: companyProfile?.bank_name || '',
      company_iban: companyProfile?.iban || '',
      company_bic: companyProfile?.bic || '',
    };

    const logoUrl = companyProfile?.logo_url || undefined;

    const pdfBlob = await generateInvoicePDFBlob(pdfInvoiceData, companyData, logoUrl);

    if (!pdfBlob || pdfBlob.size === 0) {
      throw new Error('PDF blob is empty');
    }

    const fileName = `${user.id}/${invoiceId}-invoice.pdf`;

    // Видаляємо старий PDF, якщо був
    await supabase.storage.from('invoice-pdfs').remove([fileName]);

    const { error: uploadError } = await supabase.storage
      .from('invoice-pdfs')
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('invoice-pdfs').getPublicUrl(fileName);

    if (!publicUrl) {
      throw new Error('Failed to get public PDF URL');
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update({ pdf_url: publicUrl })
      .eq('id', invoiceId);

    if (updateError) {
      throw updateError;
    }

    return publicUrl;
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

  const addItem = () => {
    setItems([
      ...items,
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
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const netTotal = items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = formData.vat_enabled ? (netTotal * formData.vat_rate) / 100 : 0;
  const grossTotal = netTotal + vatAmount;

  const formatCurrency = (amount: number) => amount.toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    isSavedManuallyRef.current = true;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    try {
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

      const invoiceData = {
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
        executor_name: companyProfile?.company_name || null,
        executor_bank: companyProfile?.bank_name || null,
        executor_iban: companyProfile?.iban || null,
        executor_bic: companyProfile?.bic || null,
        executor_tax_number: companyProfile?.tax_number || null,
        attached_file_url: attachedFile,
      };

      const existingId = id || autosaveIdRef.current;
      let invoiceId = existingId;
      let error;

      if (existingId) {
        const result = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', existingId);

        error = result.error;
      } else {
        const result = await supabase
          .from('invoices')
          .insert([invoiceData])
          .select();

        error = result.error;

        if (!error && result.data && result.data.length > 0) {
          invoiceId = result.data[0].id;
        }
      }

      if (error) {
        console.error('Error saving invoice:', error);
        showError(t('errorSavingInvoice') || `Error saving invoice: ${error.message}`);
        return;
      }

      if (!invoiceId) {
        showError('Failed to get invoice ID');
        return;
      }

      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);

      if (items.length > 0) {
        const itemsData = items.map((item, index) => ({
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
          .insert(itemsData);

        if (itemsError) {
          console.error('Error saving items:', itemsError);
          showError(t('errorSavingInvoice') || `Error saving invoice items: ${itemsError.message}`);
          return;
        }
      }

      try {
        await generateAndSavePDF(invoiceId, invoiceData, items);
      } catch (pdfError) {
        console.error('PDF generation failed:', pdfError);
        showError(t('pdfGenerationFailed') || 'Інвойс збережено, але PDF не вдалося оновити');
      }

      await queryClient.invalidateQueries({ queryKey: ['invoices'] });

      showSuccess(
        id ? (t('invoiceUpdated') || 'Invoice updated') : (t('invoiceCreated') || 'Invoice created')
      );

      navigate(`/invoices/${invoiceId}/view`);
    } catch (error) {
      console.error('Error saving invoice:', error);
      showError(t('errorSavingInvoice') || 'Error saving invoice');
    }
  };

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

          {autosaveStatus === 'saving' && (
            <span className="text-white/40 text-xs">{t('saving') || 'Збереження...'}</span>
          )}

          {autosaveStatus === 'saved' && (
            <span className="text-green-400/70 text-xs">{t('saved') || 'Збережено'}</span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
              options={currencies.map((c) => ({ value: c.code, label: `${c.code} (${c.symbol})` }))}
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
                <span className="text-white">{t('enableVat')} ({formData.vat_rate}%)</span>
              </label>

              {formData.vat_enabled && (
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-sm">{t('vatPercent')}</span>
                  <Input
                    type="number"
                    value={formData.vat_rate}
                    onChange={(e) => setFormData({ ...formData, vat_rate: Number(e.target.value) })}
                    className="w-20"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-white/60">{t('netAmount')}</span>
                <span className="font-medium text-white">{formatCurrency(netTotal)} €</span>
              </div>

              {formData.vat_enabled && (
                <div className="flex justify-between items-center">
                  <span className="text-white/60">{t('vat')} ({formData.vat_rate}%)</span>
                  <span className="font-medium text-white">{formatCurrency(vatAmount)} €</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="font-semibold text-white text-lg">{t('grossAmount')}</span>
                <span className="text-2xl font-bold text-orange-400">{formatCurrency(grossTotal)} €</span>
              </div>
            </div>
          </div>
        </div>

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

        {id && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">
              {t('attachedFile') || 'Attached File'}
            </h3>

            {attachedFile ? (
              <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <FileText className="text-orange-400" size={24} />
                  <div>
                    <p className="text-white font-medium">{t('fileAttached') || 'File attached'}</p>
                    <p className="text-white/60 text-sm">{t('clickToDownload') || 'Click to download'}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={attachedFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-blue-400 transition-all"
                  >
                    <Download size={20} />
                  </a>

                  <button
                    type="button"
                    onClick={handleDeleteFile}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-red-400 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
                <Upload className="mx-auto text-white/40 mb-3" size={32} />
                <p className="text-white/60 mb-4">{t('uploadReceiptFile') || 'Upload file'}</p>

                <label className="inline-block">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                  <span className="bg-white/10 backdrop-blur-xl border border-white/10 text-orange-500 hover:bg-white/20 px-4 py-2.5 rounded-xl font-medium cursor-pointer transition-all inline-block">
                    {uploadingFile ? t('uploading') || 'Uploading...' : t('selectFiles') || 'Select File'}
                  </span>
                </label>

                <p className="text-white/40 text-xs mt-2">
                  {t('fileSizeLimitInfo') || 'PDF, DOC, images up to 10MB'}
                </p>
              </div>
            )}
          </div>
        )}

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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsPreviewOpen(true);
            }}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-blue-400 transition-all active:scale-95"
            title={t('preview')}
          >
            <Eye className="h-4 w-4" />
          </button>

          <button
            type="submit"
            className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all active:scale-95"
            title={t('save')}
          >
            <Save className="h-4 w-4" />
          </button>
        </div>
      </form>

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
          }}
          client={clients.find((c) => c.id === formData.client_id)}
          companyProfile={companyProfile}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
};