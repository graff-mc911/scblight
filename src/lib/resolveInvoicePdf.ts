import { supabase } from './supabase';
import { calculateLineTotal } from './invoiceTotals';
import { generateInvoicePDFBlob } from './pdfGenerator';
import { fetchPdfBlob } from './shareInvoice';
import { invoicePdfFileName } from './languages';

type AnyInvoice = Record<string, any>;

async function findPdfInStorage(userId: string, invoiceId: string): Promise<string | null> {
  const { data: files, error } = await supabase.storage.from('invoice-pdfs').list(userId);

  if (error || !files) return null;

  const matchedPdf = files.find((file) => file.name.startsWith(`${invoiceId}-invoice`));
  if (!matchedPdf) return null;

  const filePath = `${userId}/${matchedPdf.name}`;
  const {
    data: { publicUrl },
  } = supabase.storage.from('invoice-pdfs').getPublicUrl(filePath);

  return publicUrl || null;
}

function buildCompanyFromInvoice(invoice: AnyInvoice, companyProfile?: AnyInvoice | null) {
  return {
    company_name: invoice.executor_name || companyProfile?.company_name || '',
    company_address: invoice.executor_address || companyProfile?.address || '',
    company_phone: invoice.executor_phone || companyProfile?.phone || '',
    company_email: invoice.executor_email || companyProfile?.email || '',
    company_tax_number: invoice.executor_tax_number || companyProfile?.tax_number || '',
    company_bank: invoice.executor_bank || companyProfile?.bank_name || '',
    company_iban: invoice.executor_iban || companyProfile?.iban || '',
    company_bic: invoice.executor_bic || companyProfile?.bic || '',
  };
}

async function generatePdfFromInvoice(
  invoice: AnyInvoice,
  userId: string,
  companyProfile?: AnyInvoice | null
): Promise<Blob> {
  const { data: itemsData } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoice.id)
    .order('sort_order');

  let clientName = invoice.clients?.name || invoice.client_name || '';
  let clientAddress = invoice.client_address || '';
  let clientTaxNumber = invoice.client_tax_number || '';
  let clientNumber = invoice.client_number || '';

  if (invoice.client_id) {
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (clientData) {
      clientName = clientData.name || clientName;
      clientAddress = clientData.address || clientAddress;
      clientTaxNumber = clientData.tax_number || clientTaxNumber;
      clientNumber = clientData.client_number || clientNumber;
    }
  }

  const items =
    itemsData?.map((item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const material = item.material || '';
      return {
        description: item.description || '',
        material,
        quantity,
        unit: item.unit || '',
        price,
        total: calculateLineTotal(quantity, price, material),
      };
    }) || [];

  const invoicePayload = {
    document_number: invoice.document_no || invoice.document_number || '',
    date: invoice.date || new Date().toISOString().split('T')[0],
    client_name: clientName,
    client_address: clientAddress,
    client_tax_number: clientTaxNumber,
    client_number: clientNumber,
    currency: invoice.currency || 'EUR',
    items,
    vat_enabled: !!invoice.vat_enabled || Number(invoice.tax_percent || 0) > 0,
    vat_rate: invoice.vat_rate || invoice.tax_percent || 0,
    notes: invoice.notes || '',
    signature_data_url: invoice.signature_data_url || '',
    signed_by: invoice.signed_by || '',
    service_period_start: invoice.work_period_start,
    service_period_end: invoice.work_period_end,
    object_address: invoice.object_address || '',
    invoice_language: invoice.invoice_language || '',
  };

  const companyData = buildCompanyFromInvoice(invoice, companyProfile);
  const logoUrl = invoice.executor_logo_url || companyProfile?.logo_url || '';

  return generateInvoicePDFBlob(invoicePayload, companyData, logoUrl);
}

/**
 * Resolve a shareable/downloadable PDF for a saved invoice row.
 * Prefers stored/uploaded PDF URLs, then storage lookup, then local generation.
 */
export async function resolveInvoicePdfFile(
  invoice: AnyInvoice,
  userId: string,
  companyProfile?: AnyInvoice | null
): Promise<{ blob: Blob; fileName: string }> {
  const docNo = invoice.document_no || invoice.document_number || invoice.id || 'invoice';
  const fileName = invoicePdfFileName(invoice.invoice_language || 'de', String(docNo));

  const candidateUrls = [
    invoice.uploaded_pdf_url,
    invoice.pdf_url,
  ].filter((url): url is string => typeof url === 'string' && url.length > 0);

  for (const url of candidateUrls) {
    try {
      const blob = await fetchPdfBlob(url);
      return { blob, fileName };
    } catch (error) {
      console.warn('Could not fetch invoice PDF url', url, error);
    }
  }

  if (invoice.source !== 'uploaded') {
    try {
      const storageUrl = await findPdfInStorage(userId, String(invoice.id));
      if (storageUrl) {
        const blob = await fetchPdfBlob(storageUrl);
        return { blob, fileName };
      }
    } catch (error) {
      console.warn('Could not fetch invoice PDF from storage', error);
    }

    const blob = await generatePdfFromInvoice(invoice, userId, companyProfile);
    return { blob, fileName };
  }

  throw new Error(`PDF not available for invoice ${docNo}`);
}

export async function resolveInvoicePdfFiles(
  invoices: AnyInvoice[],
  userId: string,
  companyProfile?: AnyInvoice | null
): Promise<Array<{ blob: Blob; fileName: string }>> {
  const files: Array<{ blob: Blob; fileName: string }> = [];

  for (const invoice of invoices) {
    files.push(await resolveInvoicePdfFile(invoice, userId, companyProfile));
  }

  return files;
}
