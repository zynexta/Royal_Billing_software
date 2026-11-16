import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Wallet,
  Calendar,
  Layers,
  ArrowUpRight,
  Receipt,
  Eye,
  FileText,
  Loader2,
} from 'lucide-react';
import { expenseService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ProjectExpenseDetails } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface ProjectExpenseModalProps {
  isOpen: boolean;
  projectName: string | null;
  clientId?: string;
  onClose: () => void;
  onAddExpenseForProject?: (projectName: string, clientId?: string) => void;
}

export const ProjectExpenseModal: React.FC<ProjectExpenseModalProps> = ({
  isOpen,
  projectName,
  clientId,
  onClose,
  onAddExpenseForProject,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<ProjectExpenseDetails | null>(null);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && projectName) {
      setLoading(true);
      expenseService
        .getProjectDetails(projectName, clientId)
        .then((res) => {
          setDetails(res.data.data);
        })
        .catch((err) => {
          toast.error(err.response?.data?.message || 'Failed to load project details');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setDetails(null);
    }
  }, [isOpen, projectName, clientId]);

  if (!isOpen || !projectName) return null;

  const total = details?.totalExpenses || 0;
  const categories = details?.categoryBreakdown ? Object.entries(details.categoryBreakdown) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-black text-white shadow-soft">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  {projectName}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Project Ledger
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Client:{' '}
                <span className="font-semibold text-slate-800">
                  {details?.client?.clientName || 'Assigned Client'}
                </span>
                {details?.projectLocation && ` · Location: ${details.projectLocation}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              <span>Loading project expense ledger...</span>
            </div>
          ) : !details ? (
            <div className="p-16 text-center text-xs text-slate-400">
              No expense records found for this project.
            </div>
          ) : (
            <>
              {/* Top Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-soft">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                    Total Project Cost
                  </span>
                  <p className="text-2xl font-black font-mono mt-1 text-white">
                    {formatCurrency(total)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Accumulated project expenses
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Total Transactions
                  </span>
                  <p className="text-2xl font-black font-mono mt-1 text-slate-900">
                    {details.expenseCount}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Individual expense vouchers
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Quick Action
                  </span>
                  {onAddExpenseForProject && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onAddExpenseForProject(
                          details.projectName,
                          (details.client as any)?._id || clientId
                        );
                      }}
                      className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-black hover:bg-slate-800 rounded-xl transition-all shadow-soft"
                    >
                      <span>+ Add New Expense</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Category Breakdown Progress */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-soft space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" />
                    <span>Category-wise Expenditure Breakdown</span>
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {categories.length} Categories recorded
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {categories.map(([catName, stat]) => {
                    const pct = total > 0 ? (stat.total / total) * 100 : 0;
                    return (
                      <div key={catName} className="p-3 bg-slate-50/70 border border-slate-200/60 rounded-xl">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-800">{catName}</span>
                          <span className="font-mono font-black text-slate-900">
                            {formatCurrency(stat.total)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-black h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                          <span>{stat.count} voucher{stat.count > 1 ? 's' : ''}</span>
                          <span className="font-semibold">{pct.toFixed(1)}% of total</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Itemized Entries Table */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-soft space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Individual Expense Entries</span>
                  </h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {details.expenses.map((e) => (
                        <tr key={e._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-600">
                            {formatDate(e.expenseDate)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 whitespace-nowrap">
                              {e.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">
                            <div>{e.description}</div>
                            {e.notes && (
                              <div className="text-[10px] text-slate-400 mt-0.5">{e.notes}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                            {e.paymentMethod}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black font-mono text-slate-900 whitespace-nowrap">
                            {formatCurrency(e.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {e.receiptUrl ? (
                              <button
                                type="button"
                                onClick={() => setViewingReceiptUrl(e.receiptUrl || null)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:text-black bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-soft transition-all"
          >
            Close
          </button>
        </div>
      </div>

      {/* Nested Receipt Image Lightbox Modal */}
      {viewingReceiptUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setViewingReceiptUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-3xl p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Expense Receipt / Bill Voucher</span>
              <button
                onClick={() => setViewingReceiptUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-50 rounded-2xl p-2">
              <img
                src={viewingReceiptUrl}
                alt="Receipt Full View"
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
