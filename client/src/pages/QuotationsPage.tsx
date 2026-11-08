import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Download,
  Share2,
  Trash2,
  ExternalLink,
  Edit2,
  CheckCircle2,
  ArrowRight,
  ClipboardList,
  Calendar,
  AlertCircle,
  FileCheck2,
  Check,
  Send,
  XCircle,
} from 'lucide-react';
import { Quotation, QuotationStatus, ApprovalMethod } from '../types';
import { quotationService } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { QuotationApprovalModal } from '../components/quotations/QuotationApprovalModal';
import { QuotationRejectModal } from '../components/quotations/QuotationRejectModal';
import { QuotationWhatsAppModal } from '../components/quotations/QuotationWhatsAppModal';

export const QuotationsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modals state
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);
  const [quotationForApproval, setQuotationForApproval] = useState<Quotation | null>(null);
  const [quotationForReject, setQuotationForReject] = useState<Quotation | null>(null);
  const [quotationForShare, setQuotationForShare] = useState<Quotation | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isIssuingId, setIsIssuingId] = useState<string | null>(null);
  const [isConvertingId, setIsConvertingId] = useState<string | null>(null);

  const statusTabs = ['All', 'Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Converted'];

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter !== 'All') params.status = statusFilter;

      const res = await quotationService.getQuotations(params);
      setQuotations(res.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuotations();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!quotationToDelete) return;
    try {
      await quotationService.deleteQuotation(quotationToDelete._id);
      toast.success(`Quotation ${quotationToDelete.quotationNumber} deleted`);
      setQuotationToDelete(null);
      fetchQuotations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete quotation');
    }
  };

  // Handle Record Approval
  const handleApprovalConfirm = async (data: {
    approvedBy: string;
    approvalDate: string;
    approvalMethod: ApprovalMethod;
    approvalNotes: string;
  }) => {
    if (!quotationForApproval) return;
    try {
      setIsApproving(true);
      const res = await quotationService.acceptQuotation(quotationForApproval._id, data);
      toast.success(
        `Quotation ${quotationForApproval.quotationNumber} approved and marked as Accepted!`
      );
      if (res.data?.data) {
        setQuotations((prev) =>
          prev.map((item) => (item._id === res.data.data._id ? res.data.data : item))
        );
      }
      setQuotationForApproval(null);
      fetchQuotations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record approval');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Reject Quotation
  const handleRejectConfirm = async (reason: string) => {
    if (!quotationForReject) return;
    try {
      setIsRejecting(true);
      const res = await quotationService.rejectQuotation(quotationForReject._id, reason);
      toast.info(`Quotation ${quotationForReject.quotationNumber} marked as Rejected`);
      if (res.data?.data) {
        setQuotations((prev) =>
          prev.map((item) => (item._id === res.data.data._id ? res.data.data : item))
        );
      }
      setQuotationForReject(null);
      fetchQuotations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject quotation');
    } finally {
      setIsRejecting(false);
    }
  };

  // Handle Quick Issue / Send
  const handleIssueQuotation = async (q: Quotation) => {
    try {
      setIsIssuingId(q._id);
      const res = await quotationService.issueQuotation(q._id);
      toast.success(`Quotation ${q.quotationNumber} marked as Sent to client`);
      if (res.data?.data) {
        setQuotations((prev) =>
          prev.map((item) => (item._id === res.data.data._id ? res.data.data : item))
        );
      }
      fetchQuotations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to issue quotation');
    } finally {
      setIsIssuingId(null);
    }
  };

  // Handle Convert to Tax Invoice
  const handleConvertToInvoice = async (quotation: Quotation) => {
    if (quotation.status !== 'Accepted') {
      toast.info('Only accepted quotations can be converted to a Tax Invoice.');
      return;
    }

    const confirmConvert = window.confirm(
      `Convert Quotation ${quotation.quotationNumber} for ${quotation.projectName} into a Tax Invoice?\n\nThis will generate an official unique Tax Invoice number and link both documents.`
    );
    if (!confirmConvert) return;

    try {
      setIsConvertingId(quotation._id);
      const res = await quotationService.convertToInvoice(quotation._id);
      const invoiceData = res.data?.data?.invoice;
      toast.success(
        `Quotation successfully converted to Tax Invoice ${invoiceData?.invoiceNumber || ''}!`
      );
      fetchQuotations();
      if (invoiceData?._id) {
        navigate(`/invoices/${invoiceData._id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to convert quotation');
    } finally {
      setIsConvertingId(null);
    }
  };

  // Download PDF
  const handleDownloadPDF = (id: string, quotationNumber: string) => {
    const url = quotationService.getPDFDownloadUrl(id);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${quotationNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Sent':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'Accepted':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-300';
      case 'Expired':
        return 'bg-zinc-100 text-zinc-600 border-zinc-300';
      case 'Converted':
        return 'bg-black text-white border-black';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-black text-white">
                <ClipboardList className="w-4 h-4" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Quotation Management
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Prepare cost estimates, share via WhatsApp, track client approvals &amp; convert to Tax Invoices
            </p>
          </div>

          <Link
            to="/quotations/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-black hover:bg-slate-800 rounded-xl shadow-soft transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Quotation</span>
          </Link>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quotation #, project, client..."
              className="w-full pl-10 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium shadow-soft"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl overflow-x-auto no-scrollbar shadow-soft">
            {statusTabs.map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
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

        {/* Quotations Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
          {/* Mobile Swipe Hint */}
          <div className="md:hidden px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
            Swipe table left/right to view all columns →
          </div>

          {loading ? (
            <div className="p-16 text-center text-xs text-slate-500">Loading quotations...</div>
          ) : quotations.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400">
                <ClipboardList className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No quotations found</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {search || statusFilter !== 'All'
                  ? 'No quotations match the selected criteria.'
                  : 'Start by preparing your first project quotation.'}
              </p>
              <Link
                to="/quotations/new"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-black hover:bg-slate-800 rounded-xl shadow-soft mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Quotation</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Quotation #</th>
                    <th className="py-3.5 px-3 sm:px-4">Date</th>
                    <th className="py-3.5 px-3 sm:px-4">Valid Until</th>
                    <th className="py-3.5 px-3 sm:px-4">Client</th>
                    <th className="py-3.5 px-3 sm:px-4">Project</th>
                    <th className="py-3.5 px-3 sm:px-4 text-right">Taxable</th>
                    <th className="py-3.5 px-3 sm:px-4 text-right">Estimated GST</th>
                    <th className="py-3.5 px-3 sm:px-4 text-right">Estimated Total</th>
                    <th className="py-3.5 px-3 sm:px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/90">
                  {quotations.map((q) => (
                    <tr key={q._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <Link
                          to={`/quotations/${q._id}`}
                          className="font-mono font-bold text-slate-900 hover:text-black hover:underline"
                        >
                          {q.quotationNumber}
                        </Link>
                      </td>

                      <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                        {formatDate(q.quotationDate)}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            new Date(q.validUntil) < new Date() && q.status !== 'Converted'
                              ? 'text-rose-600 font-bold'
                              : 'text-slate-600'
                          }`}
                        >
                          {formatDate(q.validUntil)}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 truncate max-w-[140px]">
                          {q.clientSnapshot?.clientName}
                        </div>
                        {q.clientSnapshot?.phone && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            {q.clientSnapshot.phone}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 truncate max-w-[160px]">
                          {q.projectName}
                        </div>
                        {q.projectLocation && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                            {q.projectLocation}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right text-slate-700 whitespace-nowrap font-mono font-medium">
                        {formatCurrency(q.taxableAmount)}
                      </td>

                      <td className="py-4 px-4 text-right text-slate-600 whitespace-nowrap font-mono">
                        {q.estimatedGstDetails?.isApplicable
                          ? `${formatCurrency(q.estimatedGstDetails.totalTax)} (${q.estimatedGstDetails.rate}%)`
                          : '₹ 0.00'}
                      </td>

                      <td className="py-4 px-4 text-right font-black text-slate-900 whitespace-nowrap font-mono">
                        {formatCurrency(q.estimatedGrandTotal)}
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(
                            q.status
                          )}`}
                        >
                          {q.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Convert to Tax Invoice Button (if Accepted) */}
                          {q.status === 'Accepted' && (
                            <button
                              onClick={() => handleConvertToInvoice(q)}
                              disabled={isConvertingId === q._id}
                              title="Convert to Tax Invoice"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-black hover:bg-slate-800 rounded-lg shadow-soft transition-all active:scale-95"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>Convert</span>
                            </button>
                          )}

                          {/* Quick Send (if Draft) */}
                          {q.status === 'Draft' && (
                            <button
                              onClick={() => handleIssueQuotation(q)}
                              disabled={isIssuingId === q._id}
                              title="Mark Quotation as Sent"
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
                            >
                              <Send className="w-3.5 h-3.5 text-slate-600" />
                              <span>Send</span>
                            </button>
                          )}

                          {/* Record Approval Button (if Draft, Sent, or Expired) */}
                          {(q.status === 'Sent' || q.status === 'Draft' || q.status === 'Expired') && (
                            <button
                              onClick={() => setQuotationForApproval(q)}
                              title="Record Client Approval"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Approve</span>
                            </button>
                          )}

                          {/* Reject Button (if Draft, Sent, or Expired) */}
                          {(q.status === 'Sent' || q.status === 'Draft' || q.status === 'Expired') && (
                            <button
                              onClick={() => setQuotationForReject(q)}
                              title="Mark Quotation as Rejected"
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Reject</span>
                            </button>
                          )}

                          {/* Converted Invoice Link Badge */}
                          {q.status === 'Converted' && q.convertedInvoiceId && (
                            <Link
                              to={`/invoices/${
                                typeof q.convertedInvoiceId === 'object'
                                  ? (q.convertedInvoiceId as any)._id
                                  : q.convertedInvoiceId
                              }`}
                              title="View Linked Tax Invoice"
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
                            >
                              <span>{q.convertedInvoiceNumber || 'View Invoice'}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500" />
                            </Link>
                          )}

                          {/* View details */}
                          <Link
                            to={`/quotations/${q._id}`}
                            title="View Quotation"
                            className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>

                          {/* Edit (Draft only) */}
                          {q.status === 'Draft' && (
                            <Link
                              to={`/quotations/${q._id}/edit`}
                              title="Edit Quotation"
                              className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                          )}

                          {/* Download PDF */}
                          <button
                            onClick={() => handleDownloadPDF(q._id, q.quotationNumber)}
                            title="Download PDF"
                            className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Share on WhatsApp */}
                          <button
                            onClick={() => setQuotationForShare(q)}
                            title="Share on WhatsApp"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* Delete (if not Converted) */}
                          {q.status !== 'Converted' && (
                            <button
                              onClick={() => setQuotationToDelete(q)}
                              title="Delete Quotation"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={!!quotationToDelete}
        title="Delete Quotation"
        message={`Are you sure you want to permanently delete quotation ${quotationToDelete?.quotationNumber}? This action cannot be undone.`}
        isDestructive={true}
        confirmLabel="Delete Quotation"
        onConfirm={handleDeleteConfirm}
        onClose={() => setQuotationToDelete(null)}
      />

      <QuotationApprovalModal
        isOpen={!!quotationForApproval}
        quotation={quotationForApproval}
        isLoading={isApproving}
        onClose={() => setQuotationForApproval(null)}
        onConfirm={handleApprovalConfirm}
      />

      <QuotationRejectModal
        isOpen={!!quotationForReject}
        quotation={quotationForReject}
        isLoading={isRejecting}
        onClose={() => setQuotationForReject(null)}
        onConfirm={handleRejectConfirm}
      />

      <QuotationWhatsAppModal
        isOpen={!!quotationForShare}
        quotation={quotationForShare}
        onClose={() => setQuotationForShare(null)}
        onStatusChanged={(updated) => {
          setQuotations((prev) =>
            prev.map((item) => (item._id === updated._id ? updated : item))
          );
          fetchQuotations();
        }}
      />
    </>
  );
};
