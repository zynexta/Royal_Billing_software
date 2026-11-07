import React, { useState, useEffect } from 'react';
import { X, CreditCard, Calendar, Hash, FileText } from 'lucide-react';
import { paymentService, invoiceService, clientService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Invoice, Client, PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface PaymentModalProps {
  isOpen: boolean;
  preselectedInvoice?: Invoice | null;
  preselectedClient?: Client | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  preselectedInvoice,
  preselectedClient,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Load pending invoices & active clients
      invoiceService.getInvoices().then((res) => {
        const pending = (res.data.data as Invoice[]).filter(
          (i) => i.status !== 'Paid' && i.status !== 'Cancelled' && i.status !== 'Draft'
        );
        setInvoices(pending);

        if (preselectedClient && !preselectedInvoice) {
          const clientPending = pending.filter((inv) => {
            const cid = typeof inv.clientId === 'object' ? inv.clientId._id : inv.clientId;
            return String(cid) === String(preselectedClient._id);
          });
          if (clientPending.length > 0) {
            setSelectedInvoiceId(clientPending[0]._id);
            setAmount(String(clientPending[0].balanceDueSnapshot || ''));
          }
        }
      });

      clientService.getClients().then((res) => {
        setClients(res.data.data);
      });

      if (preselectedInvoice) {
        setSelectedInvoiceId(preselectedInvoice._id);
        const cid = typeof preselectedInvoice.clientId === 'object' ? preselectedInvoice.clientId._id : preselectedInvoice.clientId;
        setSelectedClientId(cid);
        setAmount(String(preselectedInvoice.balanceDueSnapshot || ''));
      } else if (preselectedClient) {
        setSelectedClientId(preselectedClient._id);
      }
    }
  }, [isOpen, preselectedInvoice, preselectedClient]);

  // Dynamic list of available invoices scoped to selected client if chosen
  const availableInvoices = React.useMemo(() => {
    if (!selectedClientId) return invoices;
    return invoices.filter((inv) => {
      const cid = typeof inv.clientId === 'object' ? inv.clientId._id : inv.clientId;
      return String(cid) === String(selectedClientId);
    });
  }, [invoices, selectedClientId]);

  // When selected invoice changes, automatically pick client & balance
  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    if (!invId) return;

    const inv = invoices.find((i) => i._id === invId);
    if (inv) {
      const cid = typeof inv.clientId === 'object' ? inv.clientId._id : inv.clientId;
      setSelectedClientId(cid);
      setAmount(String(inv.balanceDueSnapshot || ''));
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    if (selectedInvoiceId) {
      const inv = invoices.find((i) => i._id === selectedInvoiceId);
      const cid = typeof inv?.clientId === 'object' ? inv.clientId._id : inv?.clientId;
      if (String(cid) !== String(clientId)) {
        setSelectedInvoiceId('');
        setAmount('');
      }
    }
  };

  if (!isOpen) return null;

  const currentInvoice = invoices.find((i) => i._id === selectedInvoiceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (!selectedClientId) {
      toast.error('Please select a client.');
      return;
    }

    if (currentInvoice && numAmount > currentInvoice.balanceDueSnapshot) {
      toast.error(
        `Amount exceeds remaining invoice balance of ${formatCurrency(currentInvoice.balanceDueSnapshot)}.`
      );
      return;
    }

    try {
      setLoading(true);
      await paymentService.createPayment({
        clientId: selectedClientId,
        invoiceId: selectedInvoiceId || undefined,
        amount: numAmount,
        paymentDate,
        paymentMethod,
        transactionReference,
        notes,
      });

      toast.success('Payment recorded successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to record payment';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Record Payment Received</h3>
              <p className="text-xs text-mutedText">Log client advance, partial, or full settlement</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Invoice Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Apply To Invoice (Optional for Client Advance)
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">-- General Advance Payment (No Invoice) --</option>
                {availableInvoices.map((inv) => (
                  <option key={inv._id} value={inv._id}>
                    {inv.invoiceNumber} — {inv.projectName} (Due: {formatCurrency(inv.balanceDueSnapshot)})
                  </option>
                ))}
              </select>
              {currentInvoice && (
                <div className="flex items-center justify-between mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-mutedText">Invoice Grand Total: <strong className="text-slate-800">{formatCurrency(currentInvoice.grandTotal)}</strong></span>
                  <span className="text-mutedText">Remaining Due: <strong className="text-brand-700">{formatCurrency(currentInvoice.balanceDueSnapshot)}</strong></span>
                </div>
              )}
            </div>

            {/* Client Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Client <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                disabled={!!currentInvoice || !!preselectedClient}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:bg-slate-100"
              >
                <option value="">Select a Client</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.clientName} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Amount Received (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Payment Mode & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Transaction / UTR / Cheque Ref
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    placeholder="e.g. UTR-9988223311"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Remarks / Milestone Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 50% advance for 3rd floor slab casting completion"
                rows={2}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-soft disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

