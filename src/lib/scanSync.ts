import { supabase } from './supabase';
import { ScannedReceiptData } from './receiptOCR';

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
      expense_category: 'materials',
      original_file_url: fileUrl || null,
      ocr_raw_text: data.items || null,
      notes: data.items || null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return inserted.id as string;
}
