import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { Quotation, ApprovalMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface QuotationApprovalModalProps {
  isOpen: boolean;
  quotation: Quotation | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (data: {
    approvedBy: string;
    approvalDate: string;
    approvalMethod: ApprovalMethod;
    approvalNotes: string;
  }) => void;
}

export const QuotationApprovalModal: React.FC<QuotationApprovalModalProps> = ({
  isOpen,
  quotation,
  isLoading,
  onClose,
  onConfirm,
}) => {
  const [approvedBy, setApprovedBy] = useState('');
  const [approvalDate, setApprovalDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [approvalMethod, setApprovalMethod] = useState<ApprovalMethod>('WhatsApp');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (quotation) {
      setApprovedBy(quotation.clientSnapshot?.contactPerson || quotation.clientSnapshot?.clientName || '');
      setApprovalDate(new Date().toISOString().split('T')[0]);
      setApprovalMethod('WhatsApp');
      setApprovalNotes('');
      setError(null);
    }
  }, [quotation, isOpen]);

  if (!isOpen || !quotation) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvedBy.trim()) {
      setError('Please specify the authorized client or representative who approved this quotation.');
      return;
    }
    setError(null);
    onConfirm({
      approvedBy: approvedBy.trim(),
      approvalDate,
      approvalMethod,
      approvalNotes: approvalNotes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-premium border border-slate-200/90 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900">
                Record Client Approval
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {quotation.quotationNumber} • {quotation.projectName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-slate-400 hover:text-black rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Quotation Total
              </p>
              <p className="text-base font-black text-slate-900 font-mono mt-0.5">
                {formatCurrency(quotation.estimatedGrandTotal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Client
              </p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">
                {quotation.clientSnapshot?.clientName}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Approved By (Client / Authorized Representative) *
            </label>
            <input
              type="text"
              required
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              placeholder="e.g. Mohammed Ali (Managing Director)"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Approval Date *
              </label>
              <input
                type="date"
                required
                value={approvalDate}
                onChange={(e) => setApprovalDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Approval Method *
              </label>
              <select
                value={approvalMethod}
                onChange={(e) => setApprovalMethod(e.target.value as ApprovalMethod)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              >
                <option value="WhatsApp">WhatsApp</option>
                <option value="Email">Email</option>
                <option value="Phone">Phone</option>
                <option value="Verbal">Verbal / Discussion</option>
                <option value="In Person">In Person Meeting</option>
                <option value="Written Confirmation">Written / Formal Letter</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Approval Notes / Reference (Optional)
            </label>
            <textarea
              rows={2}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="e.g. Client confirmed via WhatsApp chat message and requested to commence mobilization."
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
            />
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              Once approved, you will be able to convert this quotation into an official Tax Invoice with one click.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-black hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-black hover:bg-slate-800 rounded-xl shadow-soft transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm &amp; Mark as Accepted</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

