import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useLocation, Link } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Calendar,
  Phone,
  Building2,
  X,
  Coins,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { paymentService } from '../services/api';
import { Payment } from '../types';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { PaymentModal } from '../components/payments/PaymentModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { useToast } from '../context/ToastContext';

export const PaymentsPage: React.FC = () => {
  const { onOpenSidebar } = useOutletContext<{ onOpenSidebar: () => void }>();
  const location = useLocation();
  const toast = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Reversed'>('All');
  const [methodFilter, setMethodFilter] = useState<string>('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(
    Boolean(location.state?.openAddModal)
  );

  // Reversal
  const [paymentToReverse, setPaymentToReverse] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await paymentService.getPayments({
        status: statusFilter === 'All' ? undefined : statusFilter,
      });
      setPayments(res.data.data);
    } catch (err: any) {
      toast.error('Failed to load payments ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  // Client-side quick filter for fast instant response
  const filteredPayments = useMemo(() => {
    const list = payments.filter((p) => {
      const client = typeof p.clientId === 'object' ? p.clientId : null;
      const invoice = typeof p.invoiceId === 'object' ? p.invoiceId : null;

      // Status check
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;

      // Method check
      if (methodFilter !== 'All' && p.paymentMethod !== methodFilter) return false;

      // Search check: Client Name, Phone, Invoice Number, UTR, Notes
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const digitsQuery = query.replace(/\D/g, '');
        const clientDigits = client?.phone ? client.phone.replace(/\D/g, '') : '';

        const clientNameMatch = client?.clientName?.toLowerCase().includes(query);
        const clientPhoneMatch =
          client?.phone?.toLowerCase().includes(query) ||
          (digitsQuery.length >= 3 && clientDigits.includes(digitsQuery));
        const invoiceNumMatch = invoice?.invoiceNumber?.toLowerCase().includes(query);
        const utrMatch = p.transactionReference?.toLowerCase().includes(query);
        const notesMatch = p.notes?.toLowerCase().includes(query);

        if (!clientNameMatch && !clientPhoneMatch && !invoiceNumMatch && !utrMatch && !notesMatch) {
          return false;
        }
      }

      return true;
    });

    // Always sort by latest timestamp first so newly recorded transactions appear at the top
    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.paymentDate).getTime();
      const timeB = new Date(b.createdAt || b.paymentDate).getTime();
      return timeB - timeA;
    });
  }, [payments, searchQuery, statusFilter, methodFilter]);

  // Calculations for KPI summary
  const totalCompletedAmount = useMemo(() => {
    return filteredPayments
      .filter((p) => p.status === 'Completed')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  const handleReverseConfirm = async () => {
    if (!paymentToReverse) return;
    if (!reversalReason.trim()) {
      toast.error('Reversal reason is required for accounting audit history.');
      return;
    }

    try {
      setReversing(true);
      await paymentService.reversePayment(paymentToReverse._id, reversalReason);
      toast.success('Payment entry reversed and balances recalculated.');
      setPaymentToReverse(null);
      setReversalReason('');
      fetchPayments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reverse payment');
    } finally {
      setReversing(false);
    }
  };

  const paymentMethodsList = [
    'All',
    'Bank Transfer',
    'NEFT',
    'RTGS',
    'IMPS',
    'UPI',
    'Cheque',
    'Cash',
    'Other',
  ];

  return (
    <>
      <Header
        onOpenSidebar={onOpenSidebar}
        title="Payment Tracking"
        subtitle="Record client advances, milestones & bank remittances"
      />

      <main className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24">
        {/* Top Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Realized Payments
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight font-mono mt-2">
              {formatCurrency(totalCompletedAmount)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              From verified bank & direct receipts
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Verified Transactions
              </span>
              <div className="p-2 bg-brand-50 text-brand-700 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight font-mono mt-2">
              {filteredPayments.length} Entries
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Matching current search & filters
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Quick Action
              </span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full mt-3 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-soft transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Record New Payment</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-soft space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input: Client Name, Phone Number, UTR, Invoice */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by client name, mobile number, invoice #, or UTR..."
                className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Payment Method Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Method:</span>
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {paymentMethodsList.map((m) => (
                    <option key={m} value={m}>
                      {m === 'All' ? 'All Methods' : m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Segmented Buttons */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                {(['All', 'Completed', 'Reversed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      statusFilter === st
                        ? 'bg-black text-white shadow-soft scale-[1.02]'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payments Table - Ultra Premium Elevated Modern Look */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-xs text-mutedText">Loading payment transactions...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600">
                <CreditCard className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {searchQuery || methodFilter !== 'All' || statusFilter !== 'All'
                  ? 'No payment records match your search criteria.'
                  : 'No payment records yet.'}
              </p>
              <p className="text-xs text-mutedText max-w-xs mx-auto">
                {searchQuery
                  ? 'Try searching with another client name, phone number, or clearing filters.'
                  : 'Record advance receipts or payments against issued project invoices.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Payment Date</th>
                    <th className="py-4 px-4">Client Name & Mobile</th>
                    <th className="py-4 px-4">Applied Invoice</th>
                    <th className="py-4 px-4">Method</th>
                    <th className="py-4 px-4">UTR / Cheque Ref</th>
                    <th className="py-4 px-4">Notes</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-right">Amount</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/90">
                  {filteredPayments.map((p) => {
                    const client = typeof p.clientId === 'object' ? p.clientId : null;
                    const invoice = typeof p.invoiceId === 'object' ? p.invoiceId : null;

                    return (
                      <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6 whitespace-nowrap text-slate-800 font-medium font-mono">
                          {formatDate(p.paymentDate)}
                        </td>

                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-900 truncate max-w-[160px]">
                            {client ? client.clientName : 'Direct Client'}
                          </p>
                          {client?.phone ? (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{client.phone}</span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400">No mobile</p>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {invoice ? (
                            <Link
                              to={`/invoices/${invoice._id}`}
                              className="font-mono font-bold text-slate-900 hover:text-black hover:underline flex items-center gap-1"
                            >
                              <span>{invoice.invoiceNumber}</span>
                            </Link>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">
                              Client Advance
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-slate-700 whitespace-nowrap">
                          <span className="font-medium bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg text-[11px]">
                            {p.paymentMethod}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {p.transactionReference || '-'}
                        </td>

                        <td className="py-4 px-4 text-slate-500 truncate max-w-xs">
                          {p.notes || '-'}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                              p.status
                            )}`}
                          >
                            {p.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`font-black font-mono text-sm ${
                              p.status === 'Reversed'
                                ? 'line-through text-slate-400'
                                : 'text-emerald-700'
                            }`}
                          >
                            + {formatCurrency(p.amount)}
                          </span>
                        </td>

                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          {p.status === 'Completed' ? (
                            <button
                              onClick={() => setPaymentToReverse(p)}
                              title="Reverse Payment Entry"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reverse</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Reversed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Record Payment Modal */}
      <PaymentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => fetchPayments()}
      />

      {/* Reversal Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!paymentToReverse}
        title="Reverse Payment Transaction"
        message={`Are you sure you want to reverse this payment of ${formatCurrency(
          paymentToReverse?.amount || 0
        )}? Invoice balances will automatically be recalculated.`}
        confirmLabel="Confirm Reversal"
        isDestructive={true}
        inputPlaceholder="Reversal reason (e.g. Bank bounced cheque, incorrect transfer allocation)"
        inputValue={reversalReason}
        onInputChange={setReversalReason}
        requireInput={true}
        isLoading={reversing}
        onConfirm={handleReverseConfirm}
        onClose={() => {
          setPaymentToReverse(null);
          setReversalReason('');
        }}
      />
    </>
  );
};
