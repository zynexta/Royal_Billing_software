import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  FileText,
  Ban,
  ArrowRight,
  CreditCard,
  Building,
  Coins,
} from 'lucide-react';
import { Invoice, PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface StatusChangeModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  initialTargetStatus?: string;
  onClose: () => void;
  onConfirm: (data: {
    status: string;
    amount?: number;
    paymentMethod?: string;
    transactionReference?: string;
    reason?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  isOpen,
  invoice,
  initialTargetStatus,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('Paid');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && invoice) {
      const target = initialTargetStatus || (invoice.status === 'Paid' ? 'Issued' : 'Paid');
      setSelectedStatus(target);
      setError(null);
      setTransactionReference('');
      setNotes('');

      if (target === 'Partially Paid') {
        // Default partial payment to 50% of remaining balance or 1000
        const half = Math.round((invoice.balanceDueSnapshot || 0) / 2);
        setAmount(half > 0 ? String(half) : '1000');
      } else {
        setAmount('');
      }
    }
  }, [isOpen, invoice, initialTargetStatus]);

  if (!isOpen || !invoice) return null;

  const currentStatus = invoice.status;
  const balanceDue = invoice.balanceDueSnapshot || 0;

  const statusConfigs: Record<
    string,
    { label: string; icon: React.ElementType; color: string; bg: string; border: string }
  > = {
    Draft: { label: 'Draft', icon: FileText, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
    Issued: { label: 'Issued', icon: FileCheck, color: 'text-brand-700', bg: 'bg-brand-50', border: 'border-brand-200' },
    'Partially Paid': {
      label: 'Partially Paid',
      icon: Clock,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    Paid: { label: 'Paid', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    Overdue: { label: 'Overdue', icon: AlertCircle, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
    Cancelled: { label: 'Cancelled', icon: Ban, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300' },
  };

  const handleStatusSelect = (st: string) => {
    setSelectedStatus(st);
    setError(null);
    if (st === 'Partially Paid' && !amount) {
      const half = Math.round(balanceDue / 2);
      setAmount(half > 0 ? String(half) : '1000');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedStatus === 'Partially Paid') {
      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        setError('Please enter a valid partial payment amount greater than zero.');
        return;
      }
      if (numAmount > balanceDue) {
        setError(`Partial amount cannot exceed remaining balance of ${formatCurrency(balanceDue)}.`);
        return;
      }
      await onConfirm({
        status: 'Partially Paid',
        amount: numAmount,
        paymentMethod,
        transactionReference: transactionReference.trim(),
        reason: notes.trim(),
      });
      return;
    }

    if (selectedStatus === 'Paid') {
      await onConfirm({
        status: 'Paid',
        paymentMethod,
        transactionReference: transactionReference.trim(),
        reason: notes.trim() || 'Full invoice balance settled upon marking status as Paid',
      });
      return;
    }

    if (selectedStatus === 'Cancelled') {
      if (!notes.trim()) {
        setError('A cancellation reason is required for tax and audit compliance.');
        return;
      }
      await onConfirm({
        status: 'Cancelled',
        reason: notes.trim(),
      });
      return;
    }

    // Other statuses: Issued, Draft, Overdue
    await onConfirm({
      status: selectedStatus,
      reason: notes.trim(),
    });
  };

  const paymentMethods: PaymentMethod[] = [
    'Bank Transfer',
    'UPI',
    'Cash',
    'Cheque',
    'Other',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-elevated border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-brand-900">{invoice.invoiceNumber}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">
                {invoice.clientSnapshot?.clientName}
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 tracking-tight mt-0.5">
              Confirm Status Change
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Status Progression Banner */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Current:</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full border text-[11px] ${
                  statusConfigs[currentStatus]?.bg || 'bg-slate-100'
                } ${statusConfigs[currentStatus]?.color || 'text-slate-700'} ${
                  statusConfigs[currentStatus]?.border || 'border-slate-200'
                }`}
              >
                {currentStatus}
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400" />

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">New:</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full border text-[11px] ${
                  statusConfigs[selectedStatus]?.bg || 'bg-slate-100'
                } ${statusConfigs[selectedStatus]?.color || 'text-slate-700'} ${
                  statusConfigs[selectedStatus]?.border || 'border-slate-200'
                }`}
              >
                {selectedStatus}
              </span>
            </div>
          </div>

          {/* Select New Target Status Grid */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Choose New Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Draft', 'Issued', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'] as const).map((st) => {
                const conf = statusConfigs[st];
                const Icon = conf.icon;
                const isSelected = selectedStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusSelect(st)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                      isSelected
                        ? `${conf.bg} ${conf.color} ${conf.border} ring-2 ring-brand-500/20 shadow-soft scale-[1.02]`
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{st}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Details based on selected status */}
          {selectedStatus === 'Paid' && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-900">Full Settlement Confirmation</p>
                  <p className="text-emerald-700 mt-0.5 leading-relaxed">
                    Remaining balance of <strong>{formatCurrency(balanceDue)}</strong> will be cleared. A full
                    settlement payment receipt will be logged in Payment Tracking.
                  </p>
                </div>
              </div>

              {balanceDue > 0 && (
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div>
                    <label className="block font-semibold text-emerald-900 mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs focus:outline-none"
                    >
                      {paymentMethods.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-emerald-900 mb-1">UTR / Ref (Optional)</label>
                    <input
                      type="text"
                      value={transactionReference}
                      onChange={(e) => setTransactionReference(e.target.value)}
                      placeholder="e.g. UTR984210"
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedStatus === 'Partially Paid' && (
            <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <Coins className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-900">Record Partial Payment Receipt</p>
                  <p className="text-amber-700 mt-0.5">
                    Remaining balance due: <strong>{formatCurrency(balanceDue)}</strong>. Enter the partial amount
                    received below.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold text-amber-900 mb-1">
                    Amount Received (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={balanceDue}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    required
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold text-amber-900 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold focus:outline-none"
                  >
                    {paymentMethods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-amber-900 mb-1">UTR / Cheque Reference</label>
                  <input
                    type="text"
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    placeholder="e.g. IMPS/NEFT Ref number"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedStatus === 'Cancelled' && (
            <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <Ban className="w-4 h-4 text-rose-600" />
                <span>Cancellation Reason Required</span>
              </div>
              <p className="text-rose-700">
                A cancellation reason is required for accounting audit history.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Scope revision, client project cancelled"
                rows={2}
                className="w-full p-2.5 bg-white border border-rose-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                required
              />
            </div>
          )}

          {selectedStatus === 'Overdue' && (
            <div className="p-4 bg-rose-50/60 border border-rose-200/80 rounded-2xl text-xs text-rose-800 space-y-1 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Mark as Overdue</span>
              </div>
              <p className="text-rose-700 leading-relaxed">
                This invoice will be flagged as <strong>Overdue</strong> in the dashboard and invoices table. Outstanding balance remains{' '}
                <strong>{formatCurrency(balanceDue)}</strong>.
              </p>
            </div>
          )}

          {selectedStatus === 'Issued' && (
            <div className="p-3.5 bg-brand-50 border border-brand-200/80 rounded-2xl text-xs text-brand-900 space-y-1 animate-in fade-in">
              <p className="font-bold">Official Issued Invoice</p>
              <p className="text-brand-700">
                Invoice status will be set to Issued. Total payable remains {formatCurrency(balanceDue)}.
              </p>
            </div>
          )}

          {selectedStatus === 'Draft' && (
            <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs text-slate-800 space-y-1 animate-in fade-in">
              <p className="font-bold">Save as Draft</p>
              <p className="text-slate-600">
                Invoice will be set to Draft mode for further scope revisions before official issue.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-soft hover:shadow-premium transition-all active:scale-[0.98] disabled:opacity-50 ${
                selectedStatus === 'Paid'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : selectedStatus === 'Cancelled'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-brand-900 hover:bg-brand-800'
              }`}
            >
              {isLoading ? 'Updating...' : `Confirm & Mark as ${selectedStatus}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

