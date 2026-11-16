import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Calendar,
  Building2,
  Users,
  Eye,
  Edit2,
  Trash2,
  FileText,
  Layers,
  ArrowUpRight,
  TrendingDown,
  X,
  Receipt,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { expenseService } from '../services/api';
import { Expense, ExpenseCategory, ExpenseSummary } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ExpenseModal } from '../components/expenses/ExpenseModal';
import { ProjectExpenseModal } from '../components/expenses/ProjectExpenseModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { useToast } from '../context/ToastContext';

const DEFAULT_FILTER_CATEGORIES = [
  'All',
  'Labour Charges',
  'Material Purchase',
  'Transportation',
  'Equipment Rental',
  'Food & Accommodation',
  'Other',
];

export const ExpensesPage: React.FC = () => {
  const { onOpenSidebar } = useOutletContext<{ onOpenSidebar: () => void }>();
  const toast = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>(undefined);
  const [preselectedProjectName, setPreselectedProjectName] = useState<string | undefined>(undefined);

  // Project details modal
  const [selectedProjectForView, setSelectedProjectForView] = useState<string | null>(null);
  const [selectedProjectClientId, setSelectedProjectClientId] = useState<string | undefined>(undefined);

  // Delete confirmation
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Lightbox view for receipt
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (categoryFilter !== 'All') params.category = categoryFilter;
      if (projectFilter !== 'All') params.project = projectFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await expenseService.getExpenses(params);
      const data = res.data?.data;
      setExpenses(data?.expenses || []);
      setSummary(data?.summary || null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchExpenses();
    }, 250);
    return () => clearTimeout(delay);
  }, [search, categoryFilter, projectFilter, startDate, endDate]);

  useEffect(() => {
    expenseService
      .getCategories()
      .then((res) => {
        if (Array.isArray(res.data?.data)) {
          setAvailableCategories(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Merged dynamic categories for filter bar
  const allCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_FILTER_CATEGORIES);
    availableCategories.forEach((c) => set.add(c));
    expenses.forEach((e) => {
      if (e.category?.trim()) set.add(e.category.trim());
    });
    return Array.from(set);
  }, [availableCategories, expenses]);

  // Unique project names for project filter dropdown
  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.projectName?.trim()) {
        set.add(e.projectName.trim());
      }
    });
    return Array.from(set).sort();
  }, [expenses]);

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return;
    try {
      setIsDeleting(true);
      await expenseService.deleteExpense(expenseToDelete._id);
      toast.success('Expense record deleted successfully.');
      setExpenseToDelete(null);
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper for Category Badge Styling
  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'Labour Charges':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Material Purchase':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Transportation':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Equipment Rental':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Food & Accommodation':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <>
      <Header
        onOpenSidebar={onOpenSidebar}
        title="Project Expense Tracking"
        subtitle="Record, manage & analyze construction site costs, material purchases & labour charges"
      />

      <main className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24">
        {/* Top 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Project Expenses */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-800" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Expenses
              </span>
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-black text-white shadow-soft group-hover:scale-110 transition-transform">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                {formatCurrency(summary?.totalExpenses || 0)}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">All-Time Cumulative</span>
                <span>· Site costs &amp; outlays</span>
              </div>
            </div>
          </div>

          {/* Card 2: This Month Expenses */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-950" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                This Month Expenses
              </span>
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-700 border border-amber-500/20 group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight font-mono">
                {formatCurrency(summary?.thisMonthExpenses || 0)}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                <span className="font-semibold text-amber-800">Current Month Outlay</span>
                <span>· Operational run-rate</span>
              </div>
            </div>
          </div>

          {/* Card 3: Projects with Expenses */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Projects with Expenses
              </span>
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200/70 group-hover:scale-110 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                {summary?.projectsCount || 0}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Active Cost Centers</span>
                <span>· Distinct sites tracked</span>
              </div>
            </div>
          </div>

          {/* Card 4: Total Expense Entries */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft hover:shadow-premium hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Expense Entries
              </span>
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 group-hover:scale-110 transition-transform">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                {summary?.totalEntries || 0}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Audited Vouchers</span>
                <span>· Fully logged transactions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Bar: Search, Category Tabs, Project Filter & Primary Action */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full lg:max-w-xs">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description, client, project..."
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black shadow-inner"
              />
            </div>

            {/* Project Filter & Date Pickers */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Project Dropdown */}
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-black shadow-soft"
              >
                <option value="All">All Projects ({uniqueProjects.length})</option>
                {uniqueProjects.map((proj) => (
                  <option key={proj} value={proj}>
                    {proj}
                  </option>
                ))}
              </select>

              {/* Start Date */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 shadow-soft">
                <span className="text-[10px] font-bold text-slate-400 uppercase">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-medium focus:outline-none text-slate-800"
                />
              </div>

              {/* End Date */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 shadow-soft">
                <span className="text-[10px] font-bold text-slate-400 uppercase">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-medium focus:outline-none text-slate-800"
                />
              </div>

              {(startDate || endDate || projectFilter !== 'All' || categoryFilter !== 'All' || search) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('All');
                    setProjectFilter('All');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => {
                setExpenseToEdit(null);
                setPreselectedClientId(undefined);
                setPreselectedProjectName(undefined);
                setIsExpenseModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft hover:shadow-premium transition-all active:scale-[0.98] shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          </div>

          {/* Category Filter Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                  categoryFilter === cat
                    ? 'bg-black text-white shadow-soft scale-[1.02]'
                    : 'text-slate-600 hover:text-black bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Expenses Data Table - Premium Elevated Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
          {/* Mobile Swipe Hint */}
          <div className="md:hidden px-4 py-2 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Swipe table left/right to view all columns →</span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              <span>Loading expense ledger...</span>
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400">
                <Wallet className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No expenses found</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {search || categoryFilter !== 'All' || projectFilter !== 'All'
                  ? 'No expense vouchers match the selected filter criteria.'
                  : 'Start by recording your first project expenditure, labour cost, or material purchase.'}
              </p>
              <button
                onClick={() => {
                  setExpenseToEdit(null);
                  setIsExpenseModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-black rounded-xl hover:bg-slate-800 transition-all shadow-soft mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record New Expense</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Date</th>
                    <th className="py-3.5 px-3 sm:px-4">Client</th>
                    <th className="py-3.5 px-3 sm:px-4">Project</th>
                    <th className="py-3.5 px-3 sm:px-4">Category</th>
                    <th className="py-3.5 px-3 sm:px-4">Description</th>
                    <th className="py-3.5 px-3 sm:px-4 text-right">Amount</th>
                    <th className="py-3.5 px-3 sm:px-4 text-center">Method</th>
                    <th className="py-3.5 px-3 sm:px-4 text-center">Receipt</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((e) => {
                    const clientObj =
                      typeof e.clientId === 'object' && e.clientId ? (e.clientId as any) : null;
                    const clientName = clientObj?.clientName || e.clientSnapshot?.clientName || 'Client';
                    const clientLocation = clientObj?.city || e.clientSnapshot?.city || '';

                    return (
                      <tr key={e._id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Date */}
                        <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap font-semibold text-slate-600">
                          {formatDate(e.expenseDate)}
                        </td>

                        {/* Client */}
                        <td className="py-3.5 px-3 sm:px-4">
                          <div className="font-bold text-slate-900">{clientName}</div>
                          {clientLocation && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{clientLocation}</div>
                          )}
                        </td>

                        {/* Project (Clickable to open project modal) */}
                        <td className="py-3.5 px-3 sm:px-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProjectForView(e.projectName);
                              setSelectedProjectClientId(
                                clientObj?._id?.toString() || (e.clientId as any)?.toString()
                              );
                            }}
                            className="text-left font-bold text-slate-900 hover:text-black hover:underline flex items-center gap-1 group"
                          >
                            <span>{e.projectName}</span>
                            <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-black transition-colors" />
                          </button>
                          {e.projectLocation && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{e.projectLocation}</div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(
                              e.category
                            )}`}
                          >
                            {e.category}
                          </span>
                        </td>

                        {/* Description & Notes */}
                        <td className="py-3.5 px-3 sm:px-4 max-w-xs">
                          <div className="font-medium text-slate-800 line-clamp-2">{e.description}</div>
                          {e.notes && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate italic">
                              Note: {e.notes}
                            </div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap font-black font-mono text-slate-900">
                          {formatCurrency(e.amount)}
                        </td>

                        {/* Payment Method */}
                        <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                            {e.paymentMethod}
                          </span>
                        </td>

                        {/* Receipt Thumbnail */}
                        <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                          {e.receiptUrl ? (
                            <button
                              type="button"
                              onClick={() => setViewingReceiptUrl(e.receiptUrl || null)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              title="Click to view voucher receipt"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Project Details */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProjectForView(e.projectName);
                                setSelectedProjectClientId(
                                  clientObj?._id?.toString() || (e.clientId as any)?.toString()
                                );
                              }}
                              className="p-1.5 text-slate-500 hover:text-black hover:bg-slate-100 rounded-lg transition-colors"
                              title="View Project Expense Details"
                            >
                              <Layers className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Expense */}
                            <button
                              type="button"
                              onClick={() => {
                                setExpenseToEdit(e);
                                setIsExpenseModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-black hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Expense"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Expense */}
                            <button
                              type="button"
                              onClick={() => setExpenseToDelete(e)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* Add / Edit Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        expenseToEdit={expenseToEdit}
        preselectedClientId={preselectedClientId}
        preselectedProjectName={preselectedProjectName}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        onSuccess={fetchExpenses}
      />

      {/* Project-Wise Expense Details Modal */}
      <ProjectExpenseModal
        isOpen={Boolean(selectedProjectForView)}
        projectName={selectedProjectForView}
        clientId={selectedProjectClientId}
        onClose={() => {
          setSelectedProjectForView(null);
          setSelectedProjectClientId(undefined);
        }}
        onAddExpenseForProject={(pName, cId) => {
          setSelectedProjectForView(null);
          setExpenseToEdit(null);
          setPreselectedClientId(cId);
          setPreselectedProjectName(pName);
          setIsExpenseModalOpen(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(expenseToDelete)}
        title="Delete Expense Record"
        message={`Are you sure you want to delete the expense "${expenseToDelete?.description}" of ${formatCurrency(
          expenseToDelete?.amount || 0
        )} for project "${expenseToDelete?.projectName}"?\n\nThis will remove the voucher from project expenditure tracking.`}
        confirmLabel="Delete Expense"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setExpenseToDelete(null)}
      />

      {/* Lightbox Modal for Receipt Image */}
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
    </>
  );
};

