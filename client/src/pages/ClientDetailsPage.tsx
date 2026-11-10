import React, { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Plus,
  ExternalLink,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { clientService } from '../services/api';
import { Client, Invoice, Payment, Quotation, QuotationStatus } from '../types';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { PaymentModal } from '../components/payments/PaymentModal';

export const ClientDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { onOpenSidebar } = useOutletContext<{ onOpenSidebar: () => void }>();

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchClientDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await clientService.getClientById(id);
      setClient(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-xs text-mutedText">
        Loading client history...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm font-semibold text-slate-800">Client not found.</p>
        <Link to="/clients" className="text-xs font-semibold text-brand-600">
          Return to clients list
        </Link>
      </div>
    );
  }

  const stats = client.stats || { totalBilled: 0, totalPaid: 0, outstandingBalance: 0, invoiceCount: 0, quotationCount: 0 };

  const getQuotationStatusBadge = (status: QuotationStatus | string) => {
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
      <Header
        onOpenSidebar={onOpenSidebar}
        title={client.clientName}
        subtitle="Customer billing profile, statement ledger & project history"
      />

      <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full pb-24">
        {/* Top Back Link & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            to="/clients"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Clients</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/quotations/new"
              state={{ preselectedClientId: client._id }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl shadow-soft transition-all active:scale-[0.98]"
            >
              <ClipboardList className="w-3.5 h-3.5 text-slate-700" />
              <span>New Quotation</span>
            </Link>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Client Payment</span>
            </button>
            <Link
              to="/invoices/new"
              state={{ preselectedClientId: client._id }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft hover:shadow-premium transition-all active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Invoice for Client</span>
            </Link>
          </div>
        </div>

        {/* Client Summary & Financial Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Profile Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50 text-brand-700 font-bold text-lg">
                <Building className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-base font-bold text-slate-900 truncate">{client.clientName}</h3>
                {client.contactPerson && (
                  <p className="text-xs text-mutedText truncate">Attn: {client.contactPerson}</p>
                )}
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{client.phone}</span>
              </div>
              {client.email && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{client.email}</span>
                </div>
              )}
              <div className="flex items-start gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  {client.billingAddress}, {client.city}, {client.state} - {client.pincode}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-mutedText">GST Registration:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {client.gstin || 'Unregistered'}
                </span>
              </div>
            </div>
          </div>

          {/* 3 Metric Summary Cards for this Client */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-mutedText uppercase tracking-wider">Total Billed</span>
                <DollarSign className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 mt-2">{formatCurrency(stats.totalBilled)}</p>
                <p className="text-xs text-mutedText mt-0.5">
                  {stats.invoiceCount} Invoices · {client.quotations?.length ?? stats.quotationCount ?? 0} Quotations
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-mutedText uppercase tracking-wider">Total Paid</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-emerald-700 mt-2">{formatCurrency(stats.totalPaid)}</p>
                <p className="text-xs text-mutedText mt-0.5">Verified Collections</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-mutedText uppercase tracking-wider">Balance Due</span>
                <AlertCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <p className={`text-2xl font-extrabold mt-2 ${stats.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatCurrency(stats.outstandingBalance)}
                </p>
                <p className="text-xs text-mutedText mt-0.5">Pending Receivables</p>
              </div>
            </div>
          </div>
        </div>

        {/* Client Quotations Ledger */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-700" />
              <h4 className="text-sm font-bold text-slate-900">
                Commercial Quotations ({client.quotations?.length || 0})
              </h4>
            </div>
            <Link
              to="/quotations/new"
              state={{ preselectedClientId: client._id }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-black hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Quotation</span>
            </Link>
          </div>

          {!client.quotations || client.quotations.length === 0 ? (
            <div className="p-8 text-center text-xs text-mutedText">
              No quotations created for this client yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Quotation #</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Valid Until</th>
                    <th className="py-3 px-4 text-right">Taxable</th>
                    <th className="py-3 px-4 text-right">Estimated Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {client.quotations.map((q: Quotation) => (
                    <tr key={q._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                        <Link to={`/quotations/${q._id}`} className="hover:underline">
                          {q.quotationNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div className="truncate max-w-[180px] font-bold">{q.projectName}</div>
                        {q.projectLocation && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {q.projectLocation}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatDate(q.quotationDate)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatDate(q.validUntil)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-700 font-mono">
                        {formatCurrency(q.taxableAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono">
                        {formatCurrency(q.estimatedGrandTotal)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getQuotationStatusBadge(
                            q.status
                          )}`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <Link
                          to={`/quotations/${q._id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:underline"
                        >
                          View <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Client Invoices Ledger */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">Project Invoices ({client.invoices?.length || 0})</h4>
          </div>

          {!client.invoices || client.invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-mutedText">
              No invoices generated for this client yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Invoice Number</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Taxable</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {client.invoices.map((inv: Invoice) => (
                    <tr key={inv._id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-6 font-mono font-bold text-brand-700">
                        <Link to={`/invoices/${inv._id}`} className="hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{inv.projectName}</td>
                      <td className="py-3.5 px-4 text-slate-600">{formatDate(inv.invoiceDate)}</td>
                      <td className="py-3.5 px-4 text-right text-slate-700">{formatCurrency(inv.taxableAmount)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">{formatCurrency(inv.grandTotal)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <Link
                          to={`/invoices/${inv._id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800"
                        >
                          View <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Client Payments History */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">Recorded Payment History ({client.payments?.length || 0})</h4>
          </div>

          {!client.payments || client.payments.length === 0 ? (
            <div className="p-8 text-center text-xs text-mutedText">
              No payments recorded for this client yet.
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
                  {client.payments.map((p: Payment) => (
                    <tr key={p._id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-6 text-slate-800 font-medium">{formatDate(p.paymentDate)}</td>
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

      <PaymentModal
        isOpen={isPaymentModalOpen}
        preselectedClient={client}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => fetchClientDetails()}
      />
    </>
  );
};

