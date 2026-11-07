import { Invoice } from '../types';
import { formatCurrency } from './formatters';

export function getInvoiceWhatsAppUrl(invoice: Invoice): string {
  const clientName = invoice.clientSnapshot?.clientName || 'Client';
  const projectName = invoice.projectName || 'Project';
  const phone = invoice.clientSnapshot?.phone || '';
  const dateFormatted = new Date(invoice.invoiceDate).toLocaleDateString('en-IN');
  const received = invoice.amountReceivedSnapshot ?? 0;
  const balance = invoice.balanceDueSnapshot ?? Math.max(0, invoice.grandTotal - received);

  const text =
    `Hello ${clientName},\n\n` +
    `Your invoice for *${projectName}* is ready.\n\n` +
    `*Invoice Number:* ${invoice.invoiceNumber}\n` +
    `*Invoice Date:* ${dateFormatted}\n` +
    `*Invoice Amount:* ${formatCurrency(invoice.grandTotal)}\n` +
    `*Amount Received:* ${formatCurrency(received)}\n` +
    `*Balance Due:* ${formatCurrency(balance)}\n` +
    `*Payment Status:* ${invoice.status.toUpperCase()}\n\n` +
    `Please find your invoice attached / contact us on WhatsApp at +91 88910 03031 for any billing queries.\n\n` +
    `Thank you for your business!`;

  const cleanPhone = phone.replace(/[^0-9]/g, '') || '8891003031';
  const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
}

export function openWhatsAppDirect(invoice: Invoice) {
  const url = getInvoiceWhatsAppUrl(invoice);
  
  // Directly open WhatsApp in a new tab without popup blocker
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  
  // Fallback for mobile devices or popup blockers
  if (!win || win.closed || typeof win.closed === 'undefined') {
    window.location.href = url;
  }
}

