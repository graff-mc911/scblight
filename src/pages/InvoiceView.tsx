import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  Trash2,
  PenTool,
  Send,
  Mail,
  ZoomIn,
  ZoomOut,
  Edit2,
  Eye,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { InvoicePreview } from '../components/InvoicePreview';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext } from '../contexts/ToastContext';

export const InvoiceView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showSuccess, showError } = useToastContext();

  const [invoice, setInvoice] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showFullScreenPDF, setShowFullScreenPDF] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);

  const isMobile = window.innerWidth < 768;

  const findPdfInStorage = useCallback(async (userId: string, invoiceId: string) => {
    const { data: files, error } = await supabase.storage
      .from('invoice-pdfs')
      .list(userId);

    if (error || !files) return null;

    const matchedPdf = files.find((file) => file.name.startsWith(`${invoiceId}-invoice`));
    if (!matchedPdf) return null;

    const filePath = `${userId}/${matchedPdf.name}`;
    const {
      data: { publicUrl },
    } = supabase.storage.from('invoice-pdfs').getPublicUrl(filePath);

    return publicUrl || null;
  }, []);

  const fetchInvoice = useCallback(async () => {
    try {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (invoiceError) throw invoiceError;

      if (!invoiceData) {
        showError(t('invoiceNotFound') || 'Invoice not found');
        navigate('/invoices');
        return;
      }

      const { data: itemsData } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('sort_order');

      const invoiceWithItems = {
        ...invoiceData,
        document_number: invoiceData.document_no,
        client_number: invoiceData.client_number,
        work_period_start: invoiceData.work_period_start,
        work_period_end: invoiceData.work_period_end,
        vat_enabled: invoiceData.tax_percent > 0,
        vat_rate: invoiceData.tax_percent || 0,
        vat_amount: invoiceData.tax_amount,
        net_total: invoiceData.total_net,
        gross_total: invoiceData.total_gross,
        project_area: invoiceData.total_project_area,
        object_address: invoiceData.object_address,
        signature_data_url: invoiceData.signature_data_url,
        signed_by: invoiceData.signed_by,
        signed_at: invoiceData.signed_at,
        items:
          itemsData?.map((item) => ({
            quantity: Number(item.quantity),
            quantityDisplay: item.quantity.toString(),
            unit: item.unit,
            price: Number(item.price),
            material: item.material,
            description: item.description || '',
            total: Number(item.total),
          })) || [],
      };

      setInvoice(invoiceWithItems);
      setAttachedFile(invoiceData.attached_file_url || null);

      let resolvedPdfUrl = invoiceData.pdf_url || null;

      if (!resolvedPdfUrl && id) {
        const storagePdfUrl = await findPdfInStorage(user.id, id);

        if (storagePdfUrl) {
          resolvedPdfUrl = storagePdfUrl;

          await supabase
            .from('invoices')
            .update({ pdf_url: storagePdfUrl })
            .eq('id', id);
        }
      }

      setPdfUrl(resolvedPdfUrl);

      if (invoiceData.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('*')
          .eq('id', invoiceData.client_id)
          .maybeSingle();

        setClient(clientData);
      } else {
        setClient(null);
      }

      const { data: profileData } = await supabase
        .from('company_profile')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setCompanyProfile(profileData || null);
    } catch (error) {
      console.error(error);
      showError(t('errorLoadingInvoice') || 'Error loading invoice');
    } finally {
      setIsLoading(false);
    }
  }, [findPdfInStorage, id, navigate, showError, t]);

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id, fetchInvoice]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!id) {
      showError('Не знайдено ID рахунку');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError(t('fileSizeLimit10mb') || 'File size must be less than 10MB');
      return;
    }

    setUploadingFile(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Користувач не авторизований');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const filePath = `${user.id}/attachments/${id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('invoice-pdfs')
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('invoice-pdfs').getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error('Не вдалося отримати public URL файлу');
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ attached_file_url: publicUrl })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      setAttachedFile(publicUrl);
      showSuccess(t('fileUploaded') || 'File uploaded successfully');
    } catch (error: any) {
      console.error('File upload error:', error);
      showError(error?.message || t('failedUploadFile') || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteFile = async () => {
    if (!attachedFile || !id) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Користувач не авторизований');
      }

      const url = new URL(attachedFile);
      const pathParts = url.pathname.split('/storage/v1/object/public/invoice-pdfs/');
      const filePath = pathParts[1];

      if (!filePath) {
        throw new Error('Не вдалося визначити шлях до файлу');
      }

      const { error: deleteError } = await supabase.storage
        .from('invoice-pdfs')
        .remove([filePath]);

      if (deleteError) {
        throw deleteError;
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ attached_file_url: null })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      setAttachedFile(null);
      showSuccess(t('fileDeleted') || 'File deleted successfully');
    } catch (error: any) {
      console.error('File delete error:', error);
      showError(error?.message || t('failedDeleteFile') || 'Failed to delete file');
    }
  };

  const handleSaveSignature = async (signatureDataUrl: string, signerName: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          signature_data_url: signatureDataUrl,
          signed_by: signerName,
          signed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setShowSignatureModal(false);
      showSuccess(t('signatureSaved') || 'Signature saved successfully');
      fetchInvoice();
    } catch {
      showError(t('failedSaveSignature') || 'Failed to save signature');
    }
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) {
      showError(t('enterEmailAddress') || 'Please enter email address');
      return;
    }

    setSendingEmail(true);

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          sent_at: new Date().toISOString(),
          sent_to: emailTo.trim(),
        })
        .eq('id', id);

      if (error) throw error;

      setShowEmailModal(false);
      setEmailTo('');
      showSuccess(t('invoiceSent') || 'Invoice marked as sent');
      fetchInvoice();
    } catch {
      showError(t('failedSendInvoice') || 'Failed to send invoice');
    } finally {
      setSendingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 px-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const invoiceData = {
    ...invoice,
    document_number: invoice.document_no || invoice.document_number,
    gross_total: invoice.total_gross || invoice.gross_total,
    net_total: invoice.total_net || invoice.net_total,
    items: invoice.items || [],
    client_name: client?.name || invoice.client_name,
    client_address: client?.address || invoice.client_address,
    client_email: client?.email,
    client_phone: client?.phone,
    client_tax_number: client?.tax_number,
    signature_data_url: invoice.signature_data_url,
    signed_by: invoice.signed_by,
    signed_at: invoice.signed_at,
  };

  return (
    <div className="min-h-screen pt-20 pb-10 px-3 md:px-6 max-w-6xl mx-auto overflow-x-hidden">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="flex items-center justify-center p-2 bg-white/10 backdrop-blur-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl mb-4 transition-all active:scale-95"
          title={t('back')}
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex justify-between items-start gap-3 mb-6">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-white mb-1">
              {t('invoicePreviewTitle')}
            </h2>
            <p className="text-white/60 text-sm break-words">
              {invoice.document_no || invoice.document_number}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            {pdfUrl && (
              <button
                type="button"
                onClick={() => setShowFullScreenPDF(true)}
                className="p-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-all active:scale-95"
                title={t('viewFile') || 'View PDF'}
              >
                <Eye size={18} />
              </button>
            )}

            {!invoice.signature_data_url && (
              <button
                type="button"
                onClick={() => setShowSignatureModal(true)}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-blue-400 transition-all active:scale-95"
                title={t('sign') || 'Sign'}
              >
                <PenTool size={18} />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setEmailTo(client?.email || '');
                setShowEmailModal(true);
              }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-green-400 transition-all active:scale-95"
              title={t('send') || 'Send'}
            >
              <Send size={18} />
            </button>

            <button
              type="button"
              onClick={() => navigate(`/invoices/${id}`)}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-orange-400 transition-all active:scale-95"
              title={t('edit')}
            >
              <Edit2 size={18} />
            </button>
          </div>
        </div>
      </div>

      <>
        <InvoicePreview
          invoice={invoiceData}
          client={client}
          companyProfile={companyProfile}
        />

        {pdfUrl && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {t('invoicePreviewTitle') || 'Invoice PDF'}
              </h3>

              <div className="flex gap-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-blue-400 transition-all"
                >
                  <Download size={20} />
                </a>

                <button
                  type="button"
                  onClick={() => setShowFullScreenPDF(true)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-orange-400 transition-all"
                >
                  <Eye size={20} />
                </button>
              </div>
            </div>

            {!isMobile && (
              <div className="rounded-xl overflow-hidden">
                <iframe
                  src={`${pdfUrl}#view=FitH`}
                  className="w-full border-0"
                  style={{ height: '800px' }}
                  title="Invoice PDF"
                />
              </div>
            )}
          </div>
        )}
      </>

      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {t('attachedFile') || 'Attached File'}
        </h3>

        {attachedFile ? (
          <div className="flex items-center justify-between gap-3 bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="text-orange-400 flex-shrink-0" size={24} />
              <div className="min-w-0">
                <p className="text-white font-medium">
                  {t('fileAttached') || 'File attached'}
                </p>
                <p className="text-white/60 text-sm break-words">
                  {t('clickToDownload') || 'Click to download'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
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
            <p className="text-white/60 mb-4">
              {t('uploadReceiptFile') || 'Upload file'}
            </p>

            <label className="inline-block">
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
              />
              <span className="bg-white/10 backdrop-blur-xl border border-white/10 text-orange-500 hover:bg-white/20 px-4 py-2.5 rounded-xl font-medium cursor-pointer transition-all inline-block">
                {uploadingFile
                  ? t('uploading') || 'Uploading...'
                  : t('selectFiles') || 'Select File'}
              </span>
            </label>

            <p className="text-white/40 text-xs mt-2">
              {t('fileSizeLimitInfo') || 'PDF, DOC, images up to 10MB'}
            </p>
          </div>
        )}
      </div>

      {showSignatureModal && (
        <SignatureCanvas
          onSave={handleSaveSignature}
          onClose={() => setShowSignatureModal(false)}
          existingSignature={invoice.signature_data_url}
          existingSignerName={invoice.signed_by}
        />
      )}

      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Mail className="text-green-400" size={24} />
                <h3 className="text-xl font-semibold text-white">
                  {t('sendInvoice') || 'Send Invoice'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="text-white" size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('recipientEmail') || 'Recipient Email'}
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder={t('enterEmail') || 'Enter email address'}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
                />
              </div>

              {invoice.sent_at && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-sm text-blue-300">
                    {t('previouslySent') || 'Previously sent to'}: {invoice.sent_to}
                  </p>
                  <p className="text-xs text-blue-300/60 mt-1">
                    {new Date(invoice.sent_at).toLocaleString('uk-UA')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-white/10">
              <Button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 bg-white/10 border border-white/10 text-white hover:bg-white/20"
              >
                {t('cancel')}
              </Button>

              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailTo.trim()}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingEmail ? (
                  t('sending') || 'Sending...'
                ) : (
                  <>
                    <Send size={18} className="mr-2" />
                    {t('send') || 'Send'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showFullScreenPDF && pdfUrl && (
        <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
          <div className="bg-slate-900 border-b border-white/10 p-3 md:p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setShowFullScreenPDF(false);
                  setPdfZoom(100);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="text-white" size={20} />
              </button>

              <h3 className="text-sm md:text-lg font-semibold text-white truncate">
                {invoice.document_no || invoice.document_number}
              </h3>
            </div>

            {!isMobile && (
              <div className="flex items-center gap-1 md:gap-2">
                <button
                  type="button"
                  onClick={() => setPdfZoom((prev) => Math.max(50, prev - 10))}
                  disabled={pdfZoom <= 50}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ZoomOut className="text-white" size={18} />
                </button>

                <span className="text-white font-medium text-sm min-w-[60px] text-center">
                  {pdfZoom}%
                </span>

                <button
                  type="button"
                  onClick={() => setPdfZoom((prev) => Math.min(200, prev + 10))}
                  disabled={pdfZoom >= 200}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ZoomIn className="text-white" size={18} />
                </button>

                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Download className="text-white" size={18} />
                </a>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto bg-slate-800">
            {isMobile ? (
              <div className="flex flex-col items-center justify-center h-full p-6 gap-4">
                <FileText className="text-orange-400" size={56} />
                <p className="text-white font-semibold text-lg text-center">
                  {invoice.document_no || invoice.document_number}
                </p>
                <p className="text-white/60 text-sm text-center">
                  {t('tapToOpen') || 'Tap the button below to open the PDF in your browser'}
                </p>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all text-base"
                >
                  <Download size={20} />
                  {t('openPdf') || 'Open PDF'}
                </a>
              </div>
            ) : (
              <div className="p-4 flex justify-center">
                <div
                  className="bg-white shadow-2xl"
                  style={{
                    transform: `scale(${pdfZoom / 100})`,
                    transformOrigin: 'top center',
                    width: '210mm',
                  }}
                >
                  <iframe
                    src={`${pdfUrl}#view=FitH`}
                    className="w-full border-0"
                    style={{ height: 'calc(100vh - 90px)', minHeight: '600px' }}
                    title="Invoice PDF Fullscreen"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};