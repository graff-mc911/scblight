import { supabase } from './supabase';
import { ScannedReceiptData } from './receiptOCR';
import { normalizeExpenseCategory } from './expenseCategories';
import { normalizeReceiptDateSafe, parseReceiptAmount } from './receiptFieldNormalize';

export async function uploadScannedFile(file: File): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not_authenticated');

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from('scanned-documents')
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('scanned-documents').getPublicUrl(path);
  return publicUrl;
}

/** Local fallback when Storage upload fails (offline / RLS). */
export async function fileToLocalDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadScannedFileWithFallback(file: File): Promise<string> {
  try {
    return await uploadScannedFile(file);
  } catch {
    return await fileToLocalDataUrl(file);
  }
}

export type SaveExpenseFromScanOptions = {
  /** Link receipt costs to a specific invoice (job). */
  invoiceId?: string | null;
  clientId?: string | null;
};

export async function saveExpenseFromScan(
  data: ScannedReceiptData,
  fileUrl: string,
  options?: SaveExpenseFromScanOptions,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not_authenticated');

  const amount = parseReceiptAmount(data.total);
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const amountNetRaw = parseReceiptAmount(data.amount_net);
  const amountNet =
    Number.isFinite(amountNetRaw) && amountNetRaw > 0 ? amountNetRaw : safeAmount;
  const vatParsed = parseReceiptAmount(data.vat_amount);
  const vatAmount = Number.isFinite(vatParsed) ? Math.max(0, vatParsed) : 0;
  const vatRate = Number(data.vat_rate || 0) || 0;
  const category = normalizeExpenseCategory(data.category || 'other');
  const documentDate =
    normalizeReceiptDateSafe(data.date) || new Date().toISOString().split('T')[0];

  const { data: inserted, error } = await supabase
    .from('expense_documents')
    .insert({
      user_id: user.id,
      vendor_name: data.store_name || 'Receipt',
      document_number: data.receipt_number || null,
      document_date: documentDate,
      total_amount: safeAmount,
      amount_net: amountNet,
      vat_amount: vatAmount,
      vat_rate: vatRate,
      vat_enabled: !!data.vat_enabled,
      currency: data.currency || 'EUR',
      payment_method: data.payment_method || 'Bar',
      document_type: 'receipt',
      expense_category: category,
      original_file_url: fileUrl || null,
      ocr_raw_text: data.raw_text || data.items || null,
      notes: data.items || null,
      invoice_id: options?.invoiceId || null,
      client_id: options?.clientId || null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return inserted.id as string;
}
