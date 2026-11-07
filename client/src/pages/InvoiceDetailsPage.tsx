import React, { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Share2,
  Printer,
  CreditCard,
  Ban,
  FileCheck,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { invoiceService } from '../services/api';
import { Invoice, Payment } from '../types';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { PaymentModal } from '../components/payments/PaymentModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { StatusChangeModal } from '../components/invoices/StatusChangeModal';
import { useToast } from '../context/ToastContext';

export const InvoiceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { onOpenSidebar } = useOutletContext<{ onOpenSidebar: () => void }>();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatusForModal, setTargetStatusForModal] = useState<string>('Paid');
  const [cancelReason, setCancelReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchInvoice = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await invoiceService.getInvoiceById(id);
      setInvoice(res.data.data);
    } catch (err: any) {
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-xs text-mutedText">
        Loading invoice document...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm font-semibold text-slate-800">Invoice not found.</p>
        <Link to="/invoices" className="text-xs font-semibold text-brand-600">
          Return to invoice ledger
        </Link>
      </div>
    );
  }

  const handleDownloadPDF = () => {
    const url = invoiceService.getPDFDownloadUrl(invoice._id);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoice.invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppShare = async () => {
    try {
      setIsActionLoading(true);
      const res = await invoiceService.getWhatsAppShare(invoice._id);
      const { whatsappUrl, text } = res.data.data;

      // Try Native Web Share API only on mobile devices supporting file sharing
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && typeof navigator.share === 'function') {
        try {
          const pdfRes = await fetch(invoiceService.getPDFDownloadUrl(invoice._id));
          if (pdfRes.ok) {
            const pdfBlob = await pdfRes.blob();
            const pdfFile = new File([pdfBlob], `${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
              await navigator.share({
                title: `Invoice ${invoice.invoiceNumber}`,
                text: text,
                files: [pdfFile],
              });
              toast.success('Invoice PDF shared successfully!');
              return;
            }
          }
        } catch (shareErr) {
          console.warn('Native mobile share failed or canceled, falling back to direct WhatsApp link', shareErr);
        }
      }

      // Universal Reliable Fallback: Download PDF + Open WhatsApp
      handleDownloadPDF();
      if (whatsappUrl) {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        toast.info('📄 PDF downloaded! WhatsApp chat opened — attach the downloaded PDF to send as file.');
      }
    } catch (err: any) {
      console.error('WhatsApp share error:', err);
      toast.error('Failed to launch WhatsApp share');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleIssueDraft = async () => {
    try {
      setIsActionLoading(true);
      await invoiceService.issueInvoice(invoice._id);
      toast.success('Draft invoice has been officially issued!');
      fetchInvoice();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to issue invoice');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmStatusChange = async (data: {
    status: string;
    amount?: number;
    paymentMethod?: string;
    transactionReference?: string;
    reason?: string;
  }) => {
    if (!invoice) return;
    try {
      setIsActionLoading(true);
      await invoiceService.updateStatus(invoice._id, data.status, data.reason, {
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        transactionReference: data.transactionReference,
      });

      if (data.status === 'Paid') {
        toast.success(`Invoice marked as Fully Paid! Balance settled to ₹0.00.`);
      } else if (data.status === 'Partially Paid') {
        toast.success(`Payment of ${formatCurrency(data.amount || 0)} recorded and status updated to Partially Paid!`);
      } else {
        toast.success(`Status updated to ${data.status}`);
      }

      setIsStatusModalOpen(false);
      fetchInvoice();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!cancelReason.trim()) {
      toast.error('Cancellation reason is required.');
      return;
    }
    try {
      setIsActionLoading(true);
      await invoiceService.cancelInvoice(invoice._id, cancelReason);
      toast.success('Invoice cancelled.');
      setIsCancelModalOpen(false);
      fetchInvoice();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel invoice');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteInvoice = async () => {
    try {
      setIsActionLoading(true);
      await invoiceService.deleteInvoice(invoice._id);
      toast.success(`Invoice ${invoice.invoiceNumber} deleted successfully.`);
      navigate('/invoices');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setIsActionLoading(false);
    }
  };

  const client = invoice.clientSnapshot;

  return (
    <>
      <Header
        onOpenSidebar={onOpenSidebar}
        title={invoice.invoiceNumber}
        subtitle={`${invoice.invoiceType} for ${invoice.projectName}`}
      />

      <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-5xl mx-auto w-full pb-24">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            to="/invoices"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Invoices</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {invoice.status === 'Draft' && (
              <button
                onClick={handleIssueDraft}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft hover:shadow-premium transition-all active:scale-[0.98]"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Issue Official Invoice</span>
              </button>
            )}

            {invoice.status !== 'Draft' && invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && (
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-soft transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}

            <Link
              to={`/invoices/${invoice._id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-soft transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-brand-600" />
              <span>Edit Invoice</span>
            </Link>

            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-soft transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-brand-700" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 shadow-soft transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Share via WhatsApp</span>
            </button>

            {invoice.status !== 'Cancelled' && invoice.status !== 'Paid' && (
              <button
                onClick={() => setIsCancelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Invoice</span>
              </button>
            )}

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Invoice Document Canvas */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-elevated p-4 sm:p-8 md:p-12 space-y-6 sm:space-y-8">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xl sm:text-2xl font-black text-brand-900 tracking-tight font-mono">
                  {invoice.invoiceNumber}
                </span>

                {/* Interactive Status Changer */}
                <select
                  value={invoice.status}
                  onChange={(e) => {
                    setTargetStatusForModal(e.target.value);
                    setIsStatusModalOpen(true);
                  }}
                  disabled={isActionLoading}
                  title="Click to change invoice status"
                  className={`text-[11px] font-bold px-3 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all ${getStatusBadgeClass(
                    invoice.status
                  )}`}
                >
                  <option value="Draft">Draft</option>
                  <option value="Issued">Issued</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <p className="text-xs text-mutedText mt-1 uppercase tracking-wider">{invoice.invoiceType}</p>
            </div>

            <div className="sm:text-right text-xs space-y-1">
              <p className="text-slate-600">
                Invoice Date: <strong className="text-slate-900">{formatDate(invoice.invoiceDate)}</strong>
              </p>
              <p className="text-slate-600">
                Payment Due Date: <strong className="text-brand-700">{formatDate(invoice.dueDate)}</strong>
              </p>
            </div>
          </div>

          {/* Client & Project Particulars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-xs">
            {/* Left: Billed To */}
            <div className="space-y-2">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Billed To (Customer Details)
              </span>
              <p className="text-sm font-bold text-slate-900">{client.clientName}</p>
              {client.contactPerson && <p className="text-slate-700">Attn: {client.contactPerson}</p>}
              <p className="text-slate-600 leading-relaxed">
                {client.billingAddress}, {client.city}, {client.state} - {client.pincode}
              </p>
              <p className="text-slate-700">Phone: {client.phone}</p>
              <p className="font-mono text-slate-800">GSTIN: {client.gstin || 'Unregistered'}</p>
            </div>

            {/* Right: Project Particulars */}
            <div className="space-y-2">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Project Particulars
              </span>
              <p className="text-sm font-bold text-slate-900">{invoice.projectName}</p>
              {invoice.projectLocation && (
                <p className="text-slate-600">Location: {invoice.projectLocation}</p>
              )}
              {invoice.projectDescription && (
                <p className="text-slate-600">Scope: {invoice.projectDescription}</p>
              )}
              <p className="text-slate-600">Terms: {invoice.paymentTerms}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-2">#</th>
                  <th className="py-3 px-4">Description of Work / Construction</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-center">Unit</th>
                  <th className="py-3 px-4 text-right">Rate (₹)</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-2 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">{item.description}</td>
                    <td className="py-3.5 px-4 text-right text-slate-700">{item.quantity}</td>
                    <td className="py-3.5 px-4 text-center text-slate-600">{item.unit}</td>
                    <td className="py-3.5 px-4 text-right text-slate-700 font-mono">
                      {item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                      {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown Summary & Balance */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pt-6 border-t border-slate-100">
            <div className="sm:max-w-xs space-y-2 text-xs">
              {invoice.notes && (
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Notes:</span>
                  <p className="text-slate-600 mt-1 leading-relaxed">{invoice.notes}</p>
                </div>
              )}
            </div>

            <div className="w-full sm:max-w-sm space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(invoice.subtotal)}</span>
              </div>

              {invoice.discount && invoice.discount.amount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>
                    Discount ({invoice.discount.type === 'Percentage' ? `${invoice.discount.value}%` : 'Fixed'}):
                  </span>
                  <span>- {formatCurrency(invoice.discount.amount)}</span>
                </div>
              )}

              {invoice.additionalCharges > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Additional Charges:</span>
                  <span>+ {formatCurrency(invoice.additionalCharges)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-900 font-bold pt-2 border-t border-slate-100">
                <span>Taxable Amount:</span>
                <span>{formatCurrency(invoice.taxableAmount)}</span>
              </div>

              {/* GST Breakdown */}
              {invoice.gstDetails?.isApplicable ? (
                invoice.gstDetails.supplyType === 'Inter-State' ? (
                  <div className="flex justify-between text-slate-700">
                    <span>IGST ({invoice.gstDetails.igstRate}%):</span>
                    <span>{formatCurrency(invoice.gstDetails.igstAmount)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-700">
                      <span>CGST ({invoice.gstDetails.cgstRate}%):</span>
                      <span>{formatCurrency(invoice.gstDetails.cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>SGST ({invoice.gstDetails.sgstRate}%):</span>
                      <span>{formatCurrency(invoice.gstDetails.sgstAmount)}</span>
                    </div>
                  </>
                )
              ) : (
                <div className="flex justify-between text-slate-500 italic">
                  <span>GST (Exempted / Zero):</span>
                  <span>₹ 0.00</span>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-brand-900 pt-3 border-t-2 border-slate-200">
                <span>Grand Total:</span>
                <span>{formatCurrency(invoice.grandTotal)}</span>
              </div>

              <div className="flex justify-between text-emerald-700 font-bold pt-1">
                <span>Amount Received:</span>
                <span>{formatCurrency(invoice.amountReceivedSnapshot || 0)}</span>
              </div>

              <div className="flex justify-between text-base font-extrabold text-rose-600 pt-2 border-t border-slate-100">
                <span>Outstanding Balance:</span>
                <span>{formatCurrency(invoice.balanceDueSnapshot)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History Attached to this Invoice */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">
              Payments Recorded Against This Invoice ({invoice.payments?.length || 0})
            </h4>
          </div>

          {!invoice.payments || invoice.payments.length === 0 ? (
            <div className="p-8 text-center text-xs text-mutedText">
              No payments recorded against this invoice yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Payment Date</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-6 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.payments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-6 font-medium text-slate-900">{formatDate(p.paymentDate)}</td>
                      <td className="py-3.5 px-4 text-slate-700">{p.paymentMethod}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{p.transactionReference || '-'}</td>
                      <td className="py-3.5 px-4 text-mutedText truncate max-w-xs">{p.notes || '-'}</td>
                      <td className="py-3.5 px-6 text-right font-bold text-emerald-700">
                        + {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Record Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        preselectedInvoice={invoice}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => fetchInvoice()}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={isCancelModalOpen}
        title="Cancel Invoice"
        message="Are you sure you want to cancel this invoice? A cancellation reason is required for tax and audit compliance."
        confirmLabel="Confirm Cancellation"
        isDestructive={true}
        inputPlaceholder="Reason for cancellation (e.g. Scope revision, client order change)"
        inputValue={cancelReason}
        onInputChange={setCancelReason}
        requireInput={true}
        isLoading={isActionLoading}
        onConfirm={handleCancelInvoice}
        onClose={() => setIsCancelModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Invoice"
        message={`Are you sure you want to permanently delete invoice ${invoice.invoiceNumber}? All associated payment records will also be removed. This action cannot be undone.`}
        confirmLabel="Delete Invoice"
        isDestructive={true}
        isLoading={isActionLoading}
        onConfirm={handleDeleteInvoice}
        onClose={() => setIsDeleteModalOpen(false)}
      />

      {/* Premium Status Change Modal */}
      <StatusChangeModal
        isOpen={isStatusModalOpen}
        invoice={invoice}
        initialTargetStatus={targetStatusForModal}
        isLoading={isActionLoading}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleConfirmStatusChange}
      />
    </>
  );
};

