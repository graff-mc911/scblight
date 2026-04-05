export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToJSON = (data: any[], filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportInvoicesToCSV = (invoices: any[]) => {
  const data = invoices.map(inv => ({
    document_number: inv.document_number,
    date: inv.date,
    client_name: inv.client_name || 'N/A',
    net_total: inv.net_total,
    vat_amount: inv.vat_amount,
    gross_total: inv.gross_total,
    currency: inv.currency,
    status: inv.status,
    created_at: new Date(inv.created_at).toLocaleDateString(),
  }));

  exportToCSV(data, `invoices_${new Date().toISOString().split('T')[0]}`);
};

export const exportClientsToCSV = (clients: any[]) => {
  const data = clients.map(client => ({
    name: client.name,
    email: client.email || 'N/A',
    phone: client.phone || 'N/A',
    address: client.address || 'N/A',
    created_at: new Date(client.created_at).toLocaleDateString(),
  }));

  exportToCSV(data, `clients_${new Date().toISOString().split('T')[0]}`);
};

export const exportReceiptsToCSV = (receipts: any[]) => {
  const data = receipts.map(receipt => ({
    store_name: receipt.store_name,
    date: receipt.date,
    total: receipt.total,
    payment_method: receipt.payment_method || 'N/A',
    receipt_number: receipt.receipt_number || 'N/A',
    created_at: new Date(receipt.created_at).toLocaleDateString(),
  }));

  exportToCSV(data, `receipts_${new Date().toISOString().split('T')[0]}`);
};
