import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Plus,
  Download,
  Share2,
  ExternalLink,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileDown,
  Edit2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { invoiceService } from '../services/api';
import { Invoice } from '../types';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { openWhatsAppDirect } from '../utils/whatsapp';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { PaymentModal } from '../components/payments/PaymentModal';
import { StatusChangeModal } from '../components/invoices/StatusChangeModal';
import { WhatsAppShareModal } from '../components/invoices/WhatsAppShareModal';
import { useToast } from '../context/ToastContext';

export const InvoicesPage: React.FC = () => {
  const { onOpenSidebar } = useOutletContext<{ onOpenSidebar: () => void }>();
  const toast = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Deletion modal
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Partial / Full Payment recording modal
  const [invoiceForPayment, setInvoiceForPayment] = useState<Invoice | null>(null);

  // Status Change Confirmation Modal
  const [invoiceForStatusModal, setInvoiceForStatusModal] = useState<Invoice | null>(null);
  const [targetStatusForModal, setTargetStatusForModal] = useState<string>('Paid');
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  // WhatsApp Share Modal
  const [invoiceForShare, setInvoiceForShare] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await invoiceService.getInvoices({
        search: search.trim() || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      });
      setInvoices(res.data.data);
    } catch (err: any) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchInvoices();
    }, 250);
    return () => clearTimeout(delay);
  }, [search, statusFilter]);

  const handleWhatsAppShare = (inv: Invoice) => {
    try {
      openWhatsAppDirect(inv);
      toast.success('WhatsApp chat opened!');
    } catch (err: any) {
      console.error('WhatsApp share error:', err);
      toast.error('Failed to open WhatsApp');
    }
  };

  const handleDownloadPDF = (invId: string, invoiceNumber: string) => {
    const url = invoiceService.getPDFDownloadUrl(invId);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenStatusModal = (inv: Invoice, targetStatus: string) => {
    setInvoiceForStatusModal(inv);
    setTargetStatusForModal(targetStatus);
  };

  const handleConfirmStatusChange = async (data: {
    status: string;
    amount?: number;
    paymentMethod?: string;
    transactionReference?: string;
    reason?: string;
  }) => {
    if (!invoiceForStatusModal) return;
    try {
      setIsStatusUpdating(true);
      await invoiceService.updateStatus(invoiceForStatusModal._id, data.status, data.reason, {
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        transactionReference: data.transactionReference,
      });

      if (data.status === 'Paid') {
        toast.success(`Invoice ${invoiceForStatusModal.invoiceNumber} marked as Fully Paid! Balance settled to ₹0.00.`);
      } else if (data.status === 'Partially Paid') {
        toast.success(`Payment of ${formatCurrency(data.amount || 0)} recorded and status updated to Partially Paid!`);
      } else {
        toast.success(`Status updated to ${data.status}`);
      }

      setInvoiceForStatusModal(null);
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;
    try {
      setIsDeleting(true);
      await invoiceService.deleteInvoice(invoiceToDelete._id);
      toast.success(`Invoice ${invoiceToDelete.invoiceNumber} deleted successfully.`);
      setInvoiceToDelete(null);
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setIsDeleting(false);
    }
  };

  const statusOptions = ['All', 'Issued', 'Partially Paid', 'Paid', 'Draft', 'Overdue', 'Cancelled'];

  return (
    <>
      <Header
        onOpenSidebar={onOpenSidebar}
        title="Invoice Management"
        subtitle="Track billing statements, GST breakdowns & client receivables"
      />

      <main className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24">
        {/* Controls Bar: Search, Status Filter & Create Button */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice #, project, client..."
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-soft"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl overflow-x-auto no-scrollbar w-full sm:w-auto shadow-soft py-1">
              {statusOptions.map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 sm:px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                    statusFilter === st
                      ? 'bg-black text-white shadow-soft scale-[1.02]'
                      : 'text-slate-600 hover:text-black hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <Link
            to="/invoices/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft hover:shadow-premium transition-all active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Invoice</span>
          </Link>
        </div>

        {/* Invoice Data Table - Premium Monochrome Elevated Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
          {/* Mobile Swipe Hint */}
          <div className="md:hidden px-4 py-2 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Swipe table left/right to view all columns →</span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-xs text-mutedText">Loading invoice ledger...</div>
          ) : invoices.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No invoices found</p>
              <p className="text-xs text-mutedText max-w-xs mx-auto">
                {search || statusFilter !== 'All'
                  ? 'No invoices match the selected filter criteria.'
                  : 'Start by generating your first construction tax invoice.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Invoice #</th>
                    <th className="py-3.5 px-3 sm:px-4">Date</th>
                    <th className="py-3.5 px-3 sm:px-4">Client</th>
                    <th className="py-3.5 px-3 sm:px-4">Project</th>
                    <th className="py-3.5 px-3 sm:px-4 text-right">Taxable</th>
                    <th className="py-3.5 px-3 sm:px-4 text-right">GST Total</th>
                    <th className="py-3.5 px-3 sm:px-4 text-right">Grand Total</th>
                    <th className="py-3.5 px-3 sm:px-4 text-right">Paid</th>
                    <th className="py-3.5 px-3 sm:px-4 text-right">Balance Due</th>
                    <th className="py-3.5 px-3 sm:px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/90">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <Link
                          to={`/invoices/${inv._id}`}
                          className="font-mono font-bold text-slate-900 hover:text-black hover:underline block"
                        >
                          {inv.invoiceNumber}
                        </Link>
                        {inv.sourceQuotationNumber && (
                          <Link
                            to={`/quotations/${inv.sourceQuotationId}`}
                            className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-400 hover:text-slate-900 hover:underline mt-0.5"
                            title={`Converted from Quotation ${inv.sourceQuotationNumber}`}
                          >
                            <span>from {inv.sourceQuotationNumber}</span>
                          </Link>
                        )}
                      </td>

                      <td className="py-4 px-4 text-slate-600 whitespace-nowrap font-medium">
                        {formatDate(inv.invoiceDate)}
                      </td>

                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-900 truncate max-w-[150px]">
                          {inv.clientSnapshot?.clientName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">{inv.clientSnapshot?.phone}</p>
                      </td>

                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-800 truncate max-w-[150px]">{inv.projectName}</p>
                        {inv.projectLocation && (
                          <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {inv.projectLocation}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right text-slate-700 whitespace-nowrap font-mono font-medium">
                        {formatCurrency(inv.taxableAmount)}
                      </td>

                      <td className="py-4 px-4 text-right text-slate-600 whitespace-nowrap font-mono">
                        {inv.gstDetails?.isApplicable
                          ? `${formatCurrency(inv.gstDetails.totalTax)} (${inv.gstDetails.rate}%)`
                          : '₹ 0.00'}
                      </td>

                      <td className="py-4 px-4 text-right font-black text-slate-900 whitespace-nowrap font-mono">
                        {formatCurrency(inv.grandTotal)}
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-emerald-600 whitespace-nowrap font-mono">
                        {formatCurrency(inv.amountReceivedSnapshot || 0)}
                      </td>

                      <td className="py-4 px-4 text-right whitespace-nowrap font-mono">
                        <span
                          className={`font-black ${
                            inv.balanceDueSnapshot > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(inv.balanceDueSnapshot)}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <select
                          value={inv.status}
                          onChange={(e) => handleOpenStatusModal(inv, e.target.value)}
                          title="Click to update status"
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500/20 transition-all ${getStatusBadgeClass(
                            inv.status
                          )}`}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Issued">Issued</option>
                          <option value="Partially Paid">Partially Paid</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/invoices/${inv._id}`}
                            title="View Invoice"
                            className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>

                          <Link
                            to={`/invoices/${inv._id}/edit`}
                            title="Edit Invoice"
                            className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleDownloadPDF(inv._id, inv.invoiceNumber)}
                            title="Download PDF"
                            className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setInvoiceForShare(inv)}
                            title="Share on WhatsApp"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors active:scale-95"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setInvoiceToDelete(inv)}
                            title="Delete Invoice"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!invoiceToDelete}
        title="Delete Invoice"
        message={`Are you sure you want to permanently delete invoice ${invoiceToDelete?.invoiceNumber}? All associated payment records will also be removed. This cannot be undone.`}
        confirmLabel="Delete Invoice"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setInvoiceToDelete(null)}
      />

      {/* Record Partial / Full Payment Modal */}
      <PaymentModal
        isOpen={!!invoiceForPayment}
        preselectedInvoice={invoiceForPayment}
        onClose={() => setInvoiceForPayment(null)}
        onSuccess={() => {
          setInvoiceForPayment(null);
          fetchInvoices();
        }}
      />

      {/* Premium Status Change Confirmation Modal */}
      <StatusChangeModal
        isOpen={!!invoiceForStatusModal}
        invoice={invoiceForStatusModal}
        initialTargetStatus={targetStatusForModal}
        isLoading={isStatusUpdating}
        onClose={() => setInvoiceForStatusModal(null)}
        onConfirm={handleConfirmStatusChange}
      />

      {/* WhatsApp Share Options Modal */}
      <WhatsAppShareModal
        isOpen={!!invoiceForShare}
        invoice={invoiceForShare}
        onClose={() => setInvoiceForShare(null)}
      />
    </>
  );
};

