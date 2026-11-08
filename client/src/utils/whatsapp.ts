import { Invoice, Quotation } from '../types';
import { formatCurrency } from './formatters';

export function getInvoiceWhatsAppUrl(invoice: Invoice): string {
  const clientName = invoice.clientSnapshot?.clientName || 'Client';
  const projectName = invoice.projectName || 'Project';
  const phone = invoice.clientSnapshot?.phone || '';
  const dateFormatted = new Date(invoice.invoiceDate).toLocaleDateString('en-IN');
  const received = invoice.amountReceivedSnapshot ?? 0;
  const balance = invoice.balanceDueSnapshot ?? Math.max(0, invoice.grandTotal - received);
  const pdfUrl = `${window.location.origin.replace(':5173', ':5000')}/api/invoices/${invoice._id}/pdf`;

  const text =
    `Hello ${clientName},\n\n` +
    `Your tax invoice for *${projectName}* is ready.\n\n` +
    `*Invoice Number:* ${invoice.invoiceNumber}\n` +
    `*Invoice Date:* ${dateFormatted}\n` +
    `*Invoice Amount:* ${formatCurrency(invoice.grandTotal)}\n` +
    `*Amount Received:* ${formatCurrency(received)}\n` +
    `*Balance Due:* ${formatCurrency(balance)}\n` +
    `*Payment Status:* ${invoice.status.toUpperCase()}\n\n` +
    `*Download Invoice PDF:* ${pdfUrl}\n\n` +
    `Thank you for partnering with Royal Engineering & Construction!`;

  const cleanPhone = phone.replace(/[^0-9]/g, '') || '';
  const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
}

export function openWhatsAppDirect(invoice: Invoice) {
  const url = getInvoiceWhatsAppUrl(invoice);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    window.location.href = url;
  }
}

export function getQuotationWhatsAppUrl(quotation: Quotation): string {
  const clientName = quotation.clientSnapshot?.clientName || 'Client';
  const projectName = quotation.projectName || 'Project';
  const phone = quotation.clientSnapshot?.phone || '';
  const validUntilFormatted = new Date(quotation.validUntil).toLocaleDateString('en-IN');
  const pdfUrl = `${window.location.origin.replace(':5173', ':5000')}/api/quotations/${quotation._id}/pdf`;

  const text =
    `Hello ${clientName},\n\n` +
    `Please find the quotation for your project:\n\n` +
    `*Project:* ${projectName}\n` +
    `*Quotation Number:* ${quotation.quotationNumber}\n` +
    `*Estimated Amount:* ${formatCurrency(quotation.estimatedGrandTotal)}\n` +
    `*Valid Until:* ${validUntilFormatted}\n\n` +
    `*View / Download Quotation PDF:* ${pdfUrl}\n\n` +
    `Please review the quotation and share your approval.\n\n` +
    `Thank you,\nROYAL Engineering & Construction`;

  const cleanPhone = phone.replace(/[^0-9]/g, '') || '';
  const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
}

export function openQuotationWhatsAppDirect(quotation: Quotation) {
  const url = getQuotationWhatsAppUrl(quotation);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    window.location.href = url;
  }
}

