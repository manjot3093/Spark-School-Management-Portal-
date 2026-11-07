import { getAssetUrl } from '../services/api';
import toast from 'react-hot-toast';

// Types
export interface InvoiceItem {
  description: string;
  amount: number;
  quantity?: number;
  chargeType?: 'one_time' | 'recurring';
}

export interface InvoiceData {
  _id?: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  classSection?: string;
  email?: string;
  phone?: string;
  items: InvoiceItem[];
  totalAmount: number;
  invoiceDate: string;
  dueDate?: string;
  paymentStatus: 'pending' | 'partial' | 'paid';
  remarks?: string;
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
}

export const generateInvoiceHTML = (invoice: InvoiceData, schoolSettings: any) => {
  const oneTimeItems = invoice.items.filter(item => (item as any).chargeType === 'one_time');
  const recurringItems = invoice.items.filter(item => (item as any).chargeType !== 'one_time');
  
  const row = (item: InvoiceItem) => {
    const amount = parseFloat(item.amount.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const total = parseFloat((item.amount * (item.quantity || 1)).toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    return `
      <tr>
        <td>${item.description}</td>
        <td class="text-center">${item.quantity || 1}</td>
        <td class="text-right">₹${amount}</td>
        <td class="text-right">₹${total}</td>
      </tr>
    `;
  };

  const itemsRows = (oneTimeItems.length > 0 ? `<tr><td colspan="4" class="section-header">One-time charges</td></tr>${oneTimeItems.map(row).join('')}` : '') +
                    (recurringItems.length > 0 ? `<tr><td colspan="4" class="section-header">Recurring (by period)</td></tr>${recurringItems.map(row).join('')}` : '') +
                    (invoice.items.length > 0 && oneTimeItems.length === 0 && recurringItems.length === 0 ? invoice.items.map(row).join('') : '');

  const subtotal = parseFloat(invoice.totalAmount.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const schoolName = schoolSettings?.name || invoice.schoolName || 'Spark Educational Institute';
  const schoolAddress = schoolSettings?.address || invoice.schoolAddress || '';
  const schoolPhone = schoolSettings?.phone || invoice.schoolPhone || '';
  const schoolEmail = schoolSettings?.email || invoice.schoolEmail || '';
  const logoUrl = schoolSettings?.logo ? (schoolSettings.logo.startsWith('http') ? schoolSettings.logo : getAssetUrl(schoolSettings.logo)) : '';
  const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="School Logo" class="logo" />` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${invoice.invoiceNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        :root {
          --primary: #2563eb;
          --primary-dark: #1e40af;
          --slate-50: #f8fafc;
          --slate-100: #f1f5f9;
          --slate-200: #e2e8f0;
          --slate-300: #cbd5e1;
          --slate-600: #475569;
          --slate-700: #334155;
          --slate-900: #0f172a;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Inter', system-ui, sans-serif; 
          color: var(--slate-900);
          background: #f1f5f9;
          line-height: 1.5;
          padding: 40px 20px;
        }

        .invoice-card {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow: hidden;
          position: relative;
        }

        .top-bar {
          height: 8px;
          background: linear-gradient(to right, var(--primary), var(--primary-dark));
        }

        .header {
          padding: 32px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--slate-200);
        }

        .logo-container { display: flex; align-items: center; gap: 16px; }
        .logo { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; border: 1px solid var(--slate-200); }
        .school-info h1 { font-size: 20px; font-weight: 700; color: var(--slate-900); margin-bottom: 4px; }
        .school-info p { font-size: 12px; color: var(--slate-600); }

        .invoice-meta { padding: 32px; display: grid; grid-cols: 2; gap: 24px; background: var(--slate-50); border-bottom: 1px solid var(--slate-200); }
        .meta-group h2 { font-size: 24px; font-weight: 700; color: var(--primary); margin-bottom: 16px; letter-spacing: -0.025em; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .meta-item { display: flex; flex-direction: column; gap: 4px; }
        .meta-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--slate-600); letter-spacing: 0.05em; }
        .meta-value { font-size: 14px; font-weight: 600; color: var(--slate-900); }

        .details { padding: 32px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 32px; }
        .detail-box h3 { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--slate-600); border-bottom: 2px solid var(--slate-200); padding-bottom: 8px; margin-bottom: 12px; }
        .detail-row { display: flex; margin-bottom: 4px; font-size: 13px; }
        .detail-label { width: 100px; color: var(--slate-600); flex-shrink: 0; }
        .detail-value { font-weight: 600; color: var(--slate-900); }

        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: var(--slate-900); color: white; padding: 12px 16px; font-size: 11px; font-weight: 600; text-transform: uppercase; text-align: left; }
        td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid var(--slate-200); }
        .section-header { background: var(--slate-50); font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--primary); }
        .text-right { text-align: right; }
        .text-center { text-align: center; }

        .summary-container { display: flex; justify-content: flex-end; padding: 32px; }
        .summary-box { width: 300px; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
        .summary-total { border-top: 2px solid var(--slate-900); margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; color: var(--primary); }

        .footer { padding: 32px; background: var(--slate-50); border-top: 1px solid var(--slate-200); text-align: center; }
        .remarks { margin-bottom: 24px; font-size: 12px; color: var(--slate-600); font-style: italic; }
        .signatures { display: flex; justify-content: flex-end; margin-top: 40px; }
        .signature-box { text-align: center; width: 200px; }
        .signature-line { border-top: 1px solid var(--slate-900); margin-bottom: 8px; }
        .signature-text { font-size: 12px; font-weight: 600; }

        @media print {
          body { background: white; padding: 0; }
          .invoice-card { box-shadow: none; border: none; border-radius: 0; width: 100%; max-width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        <div class="top-bar"></div>
        <div class="header">
          <div class="logo-container">
            ${logoHtml}
            <div class="school-info">
              <h1>${schoolName}</h1>
              <p>${schoolAddress}</p>
              <p>${schoolPhone ? 'Phone: ' + schoolPhone : ''}${schoolPhone && schoolEmail ? ' | ' : ''}${schoolEmail ? 'Email: ' + schoolEmail : ''}</p>
            </div>
          </div>
        </div>

        <div class="invoice-meta">
          <div class="meta-group">
            <h2>INVOICE</h2>
            <div class="meta-grid">
              <div class="meta-item"><span class="meta-label">Invoice Number</span><span class="meta-value">${invoice.invoiceNumber}</span></div>
              <div class="meta-item"><span class="meta-label">Invoice Date</span><span class="meta-value">${new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
              <div class="meta-item"><span class="meta-label">Due Date</span><span class="meta-value">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span></div>
              <div class="meta-item"><span class="meta-label">Status</span><span class="meta-value" style="color: ${invoice.paymentStatus === 'paid' ? '#059669' : '#dc2626'}">${invoice.paymentStatus.toUpperCase()}</span></div>
            </div>
          </div>
        </div>

        <div class="details">
          <div class="details-grid">
            <div class="detail-box">
              <h3>Billed To</h3>
              <div class="detail-row"><span class="detail-label">Student:</span><span class="detail-value">${invoice.studentName}</span></div>
              <div class="detail-row"><span class="detail-label">Admission:</span><span class="detail-value">${invoice.admissionNumber}</span></div>
              <div class="detail-row"><span class="detail-label">Class:</span><span class="detail-value">${invoice.className} ${invoice.classSection ? '- ' + invoice.classSection : ''}</span></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50%">Description</th>
                <th class="text-center" style="width: 15%">Qty</th>
                <th class="text-right" style="width: 20%">Price</th>
                <th class="text-right" style="width: 15%">Total</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
        </div>

        <div class="summary-container">
          <div class="summary-box">
            <div class="summary-row"><span class="summary-label">Subtotal</span><span>₹${subtotal}</span></div>
            <div class="summary-row summary-total"><span>Total Payable</span><span>₹${subtotal}</span></div>
          </div>
        </div>

        <div class="footer">
          ${invoice.remarks ? `<div class="remarks">Note: ${invoice.remarks}</div>` : ''}
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-text">Authorized Signature</div>
            </div>
          </div>
        </div>
      </div>
      <script>
        window.onload = () => {
          window.print();
          setTimeout(() => window.close(), 1000);
        }
      </script>
    </body>
    </html>
  `;
};

export const handlePrintInvoice = (invoice: InvoiceData, schoolSettings: any) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const htmlContent = generateInvoiceHTML(invoice, schoolSettings);
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    toast.error('Could not open print preview. Please check if popups are blocked.');
  }
};
