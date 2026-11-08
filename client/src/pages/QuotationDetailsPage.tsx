import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Share2,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  FileCheck2,
  ExternalLink,
  ClipboardList,
  Calendar,
  Building,
  MapPin,
  Clock,
  ShieldCheck,
  Send,
  Loader2,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Quotation, QuotationStatus, ApprovalMethod } from '../types';
import { quotationService } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { QuotationApprovalModal } from '../components/quotations/QuotationApprovalModal';
import { QuotationRejectModal } from '../components/quotations/QuotationRejectModal';
import { QuotationWhatsAppModal } from '../components/quotations/QuotationWhatsAppModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

export const QuotationDetailsPage: React.FC = () => {
  const { onOpenSidebar } = useOutletContext<{ onOpenSidebar: () => void }>();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  const fetchQuotation = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await quotationService.getQuotationById(id);
      setQuotation(res.data?.data || null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch quotation details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  // Issue Draft Quotation
  const handleIssueQuotation = async () => {
    if (!quotation) return;
    try {
      setIsIssuing(true);
      await quotationService.issueQuotation(quotation._id);
      toast.success(`Quotation ${quotation.quotationNumber} issued to client`);
      fetchQuotation();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to issue quotation');
    } finally {
      setIsIssuing(false);
    }
  };

  // Record Approval
  const handleApprovalConfirm = async (data: {
    approvedBy: string;
    approvalDate: string;
    approvalMethod: ApprovalMethod;
    approvalNotes: string;
  }) => {
    if (!quotation) return;
    try {
      setIsApproving(true);
      const res = await quotationService.acceptQuotation(quotation._id, data);
      toast.success(
        `Quotation ${quotation.quotationNumber} approved and marked as Accepted!`
      );
      if (res.data?.data) {
        setQuotation(res.data.data);
      }
      setIsApprovalModalOpen(false);
      fetchQuotation();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record approval');
    } finally {
      setIsApproving(false);
    }
  };

  // Reject Quotation Confirm
  const handleRejectConfirm = async (reason: string) => {
    if (!quotation) return;
    try {
      setIsRejecting(true);
      const res = await quotationService.rejectQuotation(quotation._id, reason);
      toast.info(`Quotation ${quotation.quotationNumber} marked as Rejected`);
      if (res.data?.data) {
        setQuotation(res.data.data);
      }
      setIsRejectModalOpen(false);
      fetchQuotation();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject quotation');
    } finally {
      setIsRejecting(false);
    }
  };

  // Convert to Tax Invoice
  const handleConvertToInvoice = async () => {
    if (!quotation) return;
    if (quotation.status !== 'Accepted') {
      toast.info('Only accepted quotations can be converted into a Tax Invoice.');
      return;
    }

    const confirmed = window.confirm(
      `Convert Quotation ${quotation.quotationNumber} into an official Tax Invoice?\n\nThis will generate an official unique Tax Invoice number and link both documents.`
    );
    if (!confirmed) return;

    try {
      setIsConverting(true);
      const res = await quotationService.convertToInvoice(quotation._id);
      const invoiceData = res.data?.data?.invoice;
      toast.success(
        `Quotation successfully converted to Tax Invoice ${invoiceData?.invoiceNumber || ''}!`
      );
      if (invoiceData?._id) {
        navigate(`/invoices/${invoiceData._id}`);
      } else {
        fetchQuotation();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to convert quotation');
    } finally {
      setIsConverting(false);
    }
  };

  // Delete Quotation
  const handleDeleteConfirm = async () => {
    if (!quotation) return;
    try {
      await quotationService.deleteQuotation(quotation._id);
      toast.success(`Quotation ${quotation.quotationNumber} deleted`);
      navigate('/quotations');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete quotation');
    }
  };

  // Download PDF
  const handleDownloadPDF = () => {
    if (!quotation) return;
    const url = quotationService.getPDFDownloadUrl(quotation._id);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${quotation.quotationNumber}.pdf`;
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

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-slate-500">
        Loading quotation details...
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-16 text-center space-y-3">
        <p className="text-sm font-bold text-slate-800">Quotation not found</p>
        <Link
          to="/quotations"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-black rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Quotations</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Header
        onOpenSidebar={onOpenSidebar}
        title={quotation ? quotation.quotationNumber : 'Quotation Details'}
        subtitle={quotation ? quotation.projectName : 'Commercial cost estimate & approval status'}
        showDefaultActions={false}
      />

      <main className="p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full pb-24">
        {/* Top Navigation & Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/quotations')}
              className="p-2 text-slate-500 hover:text-black hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-black text-white">
                  <ClipboardList className="w-3.5 h-3.5" />
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-mono">
                  {quotation.quotationNumber}
                </h1>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                    quotation.status
                  )}`}
                >
                  {quotation.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {quotation.projectName} • Created {formatDate(quotation.createdAt)}
              </p>
            </div>
          </div>

          {/* Action Toolbar per Status */}
          <div className="flex flex-wrap items-center gap-2">
            {/* DRAFT Actions */}
            {quotation.status === 'Draft' && (
              <>
                <Link
                  to={`/quotations/${quotation._id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-soft"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Link>

                <button
                  onClick={handleIssueQuotation}
                  disabled={isIssuing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-black hover:bg-slate-800 rounded-xl shadow-soft transition-all active:scale-95 disabled:opacity-50"
                >
                  {isIssuing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Issue Quotation</span>
                </button>

                <button
                  onClick={() => setIsApprovalModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all shadow-soft"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Record Client Approval</span>
                </button>

                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Mark Rejected</span>
                </button>
              </>
            )}

            {/* SENT or EXPIRED Actions */}
            {(quotation.status === 'Sent' || quotation.status === 'Expired') && (
              <>
                <button
                  onClick={() => setIsApprovalModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all shadow-soft"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Record Client Approval</span>
                </button>

                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Mark Rejected</span>
                </button>
              </>
            )}

            {/* ACCEPTED Actions - Prominent CONVERT TO TAX INVOICE Button */}
            {quotation.status === 'Accepted' && (
              <button
                onClick={handleConvertToInvoice}
                disabled={isConverting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-black text-white bg-black hover:bg-slate-800 rounded-xl shadow-premium transition-all active:scale-95 disabled:opacity-50 animate-pulse hover:animate-none"
              >
                {isConverting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileCheck2 className="w-4 h-4" />
                )}
                <span>CONVERT TO TAX INVOICE</span>
              </button>
            )}

            {/* CONVERTED Actions */}
            {quotation.status === 'Converted' && quotation.convertedInvoiceId && (
              <Link
                to={`/invoices/${
                  typeof quotation.convertedInvoiceId === 'object'
                    ? (quotation.convertedInvoiceId as any)._id
                    : quotation.convertedInvoiceId
                }`}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-black hover:bg-slate-800 rounded-xl shadow-soft"
              >
                <span>View Linked Invoice ({quotation.convertedInvoiceNumber})</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}

            {/* Common Actions: Download PDF, Share WhatsApp */}
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-soft"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors shadow-soft"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Share WhatsApp</span>
            </button>

            {/* Delete (if not converted) */}
            {quotation.status !== 'Converted' && (
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                title="Delete Quotation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* If Converted: Alert Banner */}
        {quotation.status === 'Converted' && (
          <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-soft">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold">
                  This quotation has been officially converted into Tax Invoice{' '}
                  <span className="font-mono underline">{quotation.convertedInvoiceNumber}</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Converted on {formatDate(quotation.convertedAt || quotation.updatedAt)}. The
                  original estimate is permanently preserved for audit compliance.
                </p>
              </div>
            </div>
            <Link
              to={`/invoices/${
                typeof quotation.convertedInvoiceId === 'object'
                  ? (quotation.convertedInvoiceId as any)._id
                  : quotation.convertedInvoiceId
              }`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-black bg-white rounded-xl hover:bg-slate-100 transition-colors shrink-0"
            >
              <span>Open Invoice</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* If Accepted: Alert Banner with Convert CTA */}
        {quotation.status === 'Accepted' && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  Client Approval Confirmed by {quotation.approvalDetails?.approvedBy}
                </p>
                <p className="text-[11px] text-emerald-700">
                  Approved on {formatDate(quotation.approvalDetails?.approvalDate)} via{' '}
                  {quotation.approvalDetails?.approvalMethod}.
                  {quotation.approvalDetails?.approvalNotes
                    ? ` Notes: ${quotation.approvalDetails.approvalNotes}`
                    : ''}
                </p>
              </div>
            </div>

            <button
              onClick={handleConvertToInvoice}
              disabled={isConverting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-black hover:bg-slate-800 rounded-xl shadow-soft shrink-0"
            >
              {isConverting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileCheck2 className="w-3.5 h-3.5" />
              )}
              <span>Convert to Tax Invoice</span>
            </button>
          </div>
        )}

        {/* Client & Project Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Quotation Issued To
            </p>
            <div className="text-sm font-bold text-slate-900">
              {quotation.clientSnapshot?.clientName}
            </div>
            {quotation.clientSnapshot?.contactPerson && (
              <div className="text-xs text-slate-600">
                Attn: {quotation.clientSnapshot.contactPerson}
              </div>
            )}
            <div className="text-xs text-slate-500">
              {quotation.clientSnapshot?.billingAddress}, {quotation.clientSnapshot?.city},{' '}
              {quotation.clientSnapshot?.state} - {quotation.clientSnapshot?.pincode}
            </div>
            <div className="text-xs font-mono text-slate-600 pt-1">
              Ph: {quotation.clientSnapshot?.phone}{' '}
              {quotation.clientSnapshot?.gstin ? `| GSTIN: ${quotation.clientSnapshot.gstin}` : ''}
            </div>
          </div>

          {/* Project Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Project Particulars
            </p>
            <div className="text-sm font-bold text-slate-900">{quotation.projectName}</div>
            {quotation.projectLocation && (
              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{quotation.projectLocation}</span>
              </div>
            )}
            <div className="text-xs text-slate-500">{quotation.projectDescription}</div>
            <div className="text-xs text-slate-600 pt-1">
              <span className="font-bold">Payment Schedule:</span> {quotation.paymentTerms}
            </div>
          </div>
        </div>

        {/* Work Items Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-500">
              Work Items &amp; Cost Estimation
            </h2>
            <span className="text-xs font-bold text-slate-400">
              {quotation.items.length} {quotation.items.length === 1 ? 'Item' : 'Items'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Description of Work</th>
                  <th className="py-3 px-4 text-center w-24">Quantity</th>
                  <th className="py-3 px-4 text-center w-24">Unit</th>
                  <th className="py-3 px-4 text-right w-36">Rate</th>
                  <th className="py-3 px-6 text-right w-36">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/90">
                {quotation.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">{it.description}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                      {it.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600">{it.unit}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      {formatCurrency(it.rate)}
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(it.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="bg-slate-50/50 border-t border-slate-100 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-xs text-slate-500 space-y-1">
              <div>
                <span className="font-bold text-slate-700">Quotation Date:</span>{' '}
                {formatDate(quotation.quotationDate)}
              </div>
              <div>
                <span className="font-bold text-slate-700">Valid Until:</span>{' '}
                {formatDate(quotation.validUntil)}
              </div>
            </div>

            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(quotation.subtotal)}
                </span>
              </div>

              {quotation.discount && quotation.discount.amount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Discount:</span>
                  <span className="font-mono font-bold text-rose-600">
                    - {formatCurrency(quotation.discount.amount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(quotation.taxableAmount)}
                </span>
              </div>

              {quotation.estimatedGstDetails?.isApplicable && (
                <div className="flex justify-between text-slate-600">
                  <span>
                    Estimated GST ({quotation.estimatedGstDetails.rate}%{' '}
                    {quotation.estimatedGstDetails.supplyType}):
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(quotation.estimatedGstDetails.totalTax)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-900">Estimated Total:</span>
                <span className="text-base font-black font-mono text-slate-900">
                  {formatCurrency(quotation.estimatedGrandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms and Conditions Card */}
        {quotation.termsAndConditions && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Terms &amp; Conditions
            </h3>
            <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
              {quotation.termsAndConditions}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <QuotationApprovalModal
        isOpen={isApprovalModalOpen}
        quotation={quotation}
        isLoading={isApproving}
        onClose={() => setIsApprovalModalOpen(false)}
        onConfirm={handleApprovalConfirm}
      />

      <QuotationRejectModal
        isOpen={isRejectModalOpen}
        quotation={quotation}
        isLoading={isRejecting}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleRejectConfirm}
      />

      <QuotationWhatsAppModal
        isOpen={isShareModalOpen}
        quotation={quotation}
        onClose={() => setIsShareModalOpen(false)}
        onStatusChanged={(updated) => {
          setQuotation(updated);
          fetchQuotation();
        }}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Quotation"
        message={`Are you sure you want to permanently delete quotation ${quotation.quotationNumber}?`}
        isDestructive={true}
        confirmLabel="Delete Quotation"
        onConfirm={handleDeleteConfirm}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
};
