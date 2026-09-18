import { supabase } from './supabase';
import { ScannedReceiptData } from './receiptOCR';
import { normalizeExpenseCategory } from './expenseCategories';

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

export async function saveExpenseFromScan(
  data: ScannedReceiptData,
  fileUrl: string,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not_authenticated');

  const amount = Number(data.total || 0);
  const amountNet = Number(data.amount_net || amount);
  const vatAmount = Number(data.vat_amount || 0);
  const vatRate = Number(data.vat_rate || 0);
  const category = normalizeExpenseCategory(data.category || 'other');

  const { data: inserted, error } = await supabase
    .from('expense_documents')
    .insert({
      user_id: user.id,
      vendor_name: data.store_name || 'Receipt',
      document_number: data.receipt_number || null,
      document_date: data.date || new Date().toISOString().split('T')[0],
      total_amount: amount,
      amount_net: amountNet,
      vat_amount: vatAmount,
      vat_rate: vatRate,
      vat_enabled: !!data.vat_enabled,
      currency: data.currency || 'EUR',
      payment_method: data.payment_method || 'Bar',
      document_type: 'receipt',
      expense_category: category,
      original_file_url: fileUrl || null,
      ocr_raw_text: data.items || null,
      notes: data.items || null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return inserted.id as string;
}
