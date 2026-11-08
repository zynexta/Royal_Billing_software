import React, { useState } from 'react';
import { X, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Quotation } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface QuotationRejectModalProps {
  isOpen: boolean;
  quotation: Quotation | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const QuotationRejectModal: React.FC<QuotationRejectModalProps> = ({
  isOpen,
  quotation,
  isLoading,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen || !quotation) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-premium border border-slate-200/90 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-rose-50/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 text-rose-700">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900">
                Reject Quotation
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
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 font-medium">Client: </span>
              <span className="font-bold text-slate-900">{quotation.clientSnapshot?.clientName}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Est. Value: </span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(quotation.estimatedGrandTotal)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reason for Rejection (Optional)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Budget mismatch, client chose alternate contractor, or project postponed indefinitely."
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
            />
          </div>

          <div className="p-3 bg-rose-50/80 border border-rose-200/80 rounded-xl flex items-start gap-2.5 text-xs text-rose-900">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>
              Marking this quotation as <strong>Rejected</strong> updates its status and permanently prevents conversion into a Tax Invoice.
            </span>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Keep Quotation
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-soft transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Rejection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
