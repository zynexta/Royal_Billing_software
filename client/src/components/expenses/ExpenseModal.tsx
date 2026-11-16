import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  Calendar,
  Building2,
  FileText,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Tag,
  DollarSign,
  ChevronDown,
  Receipt,
} from 'lucide-react';
import { expenseService, clientService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Client, Expense, ExpensePaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface ExpenseModalProps {
  isOpen: boolean;
  expenseToEdit?: Expense | null;
  preselectedClientId?: string;
  preselectedProjectName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ExpenseRowItem {
  id: string;
  category: string;
  description: string;
  amount: string;
  paymentMethod: ExpensePaymentMethod;
  notes: string;
  receiptUrl: string;
}

const DEFAULT_CATEGORIES: string[] = [
  'Labour Charges',
  'Material Purchase',
  'Transportation',
  'Equipment Rental',
  'Food & Accommodation',
  'Site Utilities',
  'Subcontractor Payout',
  'Other',
];

const PAYMENT_METHODS: ExpensePaymentMethod[] = [
  'Cash',
  'Bank Transfer',
  'UPI',
  'Other',
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  expenseToEdit,
  preselectedClientId,
  preselectedProjectName,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [availableProjects, setAvailableProjects] = useState<
    { projectName: string; projectLocation?: string }[]
  >([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Dynamic Categories list (defaults + previously recorded + user added)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState<string | null>(null); // holds rowId being edited or 'single'
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Common Header State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [projectLocation, setProjectLocation] = useState<string>('');
  const [isCustomProject, setIsCustomProject] = useState<boolean>(false);
  const [defaultDate, setDefaultDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [defaultPaymentMethod, setDefaultPaymentMethod] =
    useState<ExpensePaymentMethod>('Cash');

  // Multi-item rows (used for new expenses)
  const [items, setItems] = useState<ExpenseRowItem[]>([
    {
      id: '1',
      category: 'Material Purchase',
      description: '',
      amount: '',
      paymentMethod: 'Cash',
      notes: '',
      receiptUrl: '',
    },
  ]);

  // Load clients and categories
  useEffect(() => {
    if (isOpen) {
      clientService
        .getClients()
        .then((res) => {
          setClients(res.data.data || []);
        })
        .catch(() => {
          toast.error('Failed to load clients list');
        });

      expenseService
        .getCategories()
        .then((res) => {
          if (Array.isArray(res.data?.data)) {
            const combined = Array.from(
              new Set([...DEFAULT_CATEGORIES, ...res.data.data])
            );
            setCategories(combined);
          }
        })
        .catch(() => {
          setCategories(DEFAULT_CATEGORIES);
        });

      if (expenseToEdit) {
        const cid =
          typeof expenseToEdit.clientId === 'object'
            ? expenseToEdit.clientId._id
            : expenseToEdit.clientId;
        setSelectedClientId(cid);
        setProjectName(expenseToEdit.projectName || '');
        setProjectLocation(expenseToEdit.projectLocation || '');
        if (expenseToEdit.expenseDate) {
          setDefaultDate(
            new Date(expenseToEdit.expenseDate).toISOString().split('T')[0]
          );
        }
        setDefaultPaymentMethod(expenseToEdit.paymentMethod || 'Cash');
        setIsCustomProject(false);
        setItems([
          {
            id: 'edit-1',
            category: expenseToEdit.category || 'Material Purchase',
            description: expenseToEdit.description || '',
            amount: String(expenseToEdit.amount || ''),
            paymentMethod: expenseToEdit.paymentMethod || 'Cash',
            notes: expenseToEdit.notes || '',
            receiptUrl: expenseToEdit.receiptUrl || '',
          },
        ]);
      } else {
        setSelectedClientId(preselectedClientId || '');
        setProjectName(preselectedProjectName || '');
        setProjectLocation('');
        setDefaultDate(new Date().toISOString().split('T')[0]);
        setDefaultPaymentMethod('Cash');
        setIsCustomProject(Boolean(preselectedProjectName));
        setItems([
          {
            id: String(Date.now()),
            category: 'Material Purchase',
            description: '',
            amount: '',
            paymentMethod: 'Cash',
            notes: '',
            receiptUrl: '',
          },
        ]);
      }
      setIsAddingNewCategory(null);
      setNewCategoryName('');
    }
  }, [isOpen, expenseToEdit, preselectedClientId, preselectedProjectName]);

  // Fetch client projects when client is selected
  useEffect(() => {
    if (!selectedClientId) {
      setAvailableProjects([]);
      return;
    }

    setLoadingProjects(true);
    expenseService
      .getClientProjects(selectedClientId)
      .then((res) => {
        const projs = res.data.data || [];
        setAvailableProjects(projs);

        if (!expenseToEdit && !preselectedProjectName) {
          if (projs.length > 0) {
            setProjectName(projs[0].projectName);
            setProjectLocation(projs[0].projectLocation || '');
            setIsCustomProject(false);
          } else {
            setProjectName('');
            setIsCustomProject(true);
          }
        }
      })
      .catch(() => {
        setAvailableProjects([]);
      })
      .finally(() => {
        setLoadingProjects(false);
      });
  }, [selectedClientId, expenseToEdit, preselectedProjectName]);

  // Handle adding custom category
  const handleCreateCustomCategory = (targetRowId?: string) => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      toast.error('Please enter a valid category name.');
      return;
    }

    if (!categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
    }

    if (targetRowId) {
      updateItem(targetRowId, { category: trimmed });
    }

    toast.success(`Category "${trimmed}" added!`);
    setIsAddingNewCategory(null);
    setNewCategoryName('');
  };

  // Row item helpers
  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        category: categories[0] || 'Labour Charges',
        description: '',
        amount: '',
        paymentMethod: defaultPaymentMethod,
        notes: '',
        receiptUrl: '',
      },
    ]);
  };

  const removeItemRow = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<ExpenseRowItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Receipt image upload handler
  const handleReceiptFileChange = (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Receipt file size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateItem(id, { receiptUrl: reader.result });
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read receipt file.');
    };
    reader.readAsDataURL(file);
  };

  // Calculate total amount across all items
  const totalAmount = items.reduce((sum, item) => {
    const val = parseFloat(item.amount);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      toast.error('Please select a client.');
      return;
    }
    if (!projectName.trim()) {
      toast.error('Please specify the project name.');
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.description.trim()) {
        toast.error(`Please provide a description for item #${i + 1}.`);
        return;
      }
      const parsedAmt = parseFloat(it.amount);
      if (isNaN(parsedAmt) || parsedAmt <= 0) {
        toast.error(`Item #${i + 1} must have an amount greater than zero.`);
        return;
      }
    }

    try {
      setLoading(true);

      if (expenseToEdit) {
        // Single update
        const single = items[0];
        const payload = {
          clientId: selectedClientId,
          projectName: projectName.trim(),
          projectLocation: projectLocation.trim(),
          category: single.category.trim(),
          description: single.description.trim(),
          amount: parseFloat(single.amount),
          expenseDate: defaultDate,
          paymentMethod: single.paymentMethod || defaultPaymentMethod,
          notes: single.notes.trim(),
          receiptUrl: single.receiptUrl.trim(),
        };

        await expenseService.updateExpense(expenseToEdit._id, payload);
        toast.success('Expense record updated successfully.');
      } else if (items.length === 1) {
        // Single create
        const single = items[0];
        const payload = {
          clientId: selectedClientId,
          projectName: projectName.trim(),
          projectLocation: projectLocation.trim(),
          category: single.category.trim(),
          description: single.description.trim(),
          amount: parseFloat(single.amount),
          expenseDate: defaultDate,
          paymentMethod: single.paymentMethod || defaultPaymentMethod,
          notes: single.notes.trim(),
          receiptUrl: single.receiptUrl.trim(),
        };

        await expenseService.createExpense(payload);
        toast.success('Project expense recorded successfully.');
      } else {
        // Batch create
        const payload = {
          clientId: selectedClientId,
          projectName: projectName.trim(),
          projectLocation: projectLocation.trim(),
          defaultDate,
          defaultPaymentMethod,
          items: items.map((it) => ({
            category: it.category.trim(),
            description: it.description.trim(),
            amount: parseFloat(it.amount),
            expenseDate: defaultDate,
            paymentMethod: it.paymentMethod || defaultPaymentMethod,
            notes: it.notes.trim(),
            receiptUrl: it.receiptUrl.trim(),
          })),
        };

        const res = await expenseService.createBatchExpenses(payload);
        toast.success(
          `Successfully recorded ${items.length} project expenses (${formatCurrency(
            totalAmount
          )})!`
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save expenses');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-black text-white shadow-soft">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  {expenseToEdit ? 'Edit Project Expense' : 'Record Project Expenses'}
                </h3>
                {!expenseToEdit && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {items.length > 1 ? `${items.length} Items Batch` : 'Multiple / Single Entry'}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-500">
                Log labour, material, transport &amp; site costs for construction projects
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

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Section A: Client & Project Setup */}
          <div className="p-4 sm:p-5 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>1. Client &amp; Project Association</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Step 1 of 2</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Client Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Client / Customer <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    setProjectName('');
                    setProjectLocation('');
                    setIsCustomProject(false);
                  }}
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-semibold text-slate-800 shadow-sm"
                >
                  <option value="">-- Choose Existing Client --</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.clientName} ({c.phone || c.city || 'Client'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Selection / Custom Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Project Name <span className="text-rose-500">*</span>
                  </label>
                  {selectedClientId && availableProjects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomProject(!isCustomProject);
                        if (isCustomProject && availableProjects.length > 0) {
                          setProjectName(availableProjects[0].projectName);
                          setProjectLocation(availableProjects[0].projectLocation || '');
                        } else {
                          setProjectName('');
                        }
                      }}
                      className="text-[11px] font-bold text-slate-600 hover:text-black underline transition-colors"
                    >
                      {isCustomProject
                        ? '← Select from Client Projects'
                        : '+ Enter New Project Name'}
                    </button>
                  )}
                </div>

                {loadingProjects ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading projects...</span>
                  </div>
                ) : isCustomProject || availableProjects.length === 0 ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g. DLF Cyber Structural Core Tower"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-semibold text-slate-800 shadow-sm"
                    />
                    <input
                      type="text"
                      value={projectLocation}
                      onChange={(e) => setProjectLocation(e.target.value)}
                      placeholder="Project Site Location (Optional, e.g. Tuvvur, Malappuram)"
                      className="w-full px-3.5 py-1.5 text-xs bg-white/70 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <select
                      value={projectName}
                      onChange={(e) => {
                        const chosen = availableProjects.find(
                          (p) => p.projectName === e.target.value
                        );
                        setProjectName(e.target.value);
                        if (chosen?.projectLocation) {
                          setProjectLocation(chosen.projectLocation);
                        }
                      }}
                      required
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-semibold text-slate-800 shadow-sm"
                    >
                      <option value="">-- Select Client Project --</option>
                      {availableProjects.map((p) => (
                        <option key={p.projectName} value={p.projectName}>
                          {p.projectName}{' '}
                          {p.projectLocation ? `(${p.projectLocation})` : ''}
                        </option>
                      ))}
                    </select>
                    {projectLocation && (
                      <p className="text-[10px] text-slate-500 font-medium px-1">
                        Site Location:{' '}
                        <span className="font-semibold text-slate-700">
                          {projectLocation}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Date and Default Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Expense Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={defaultDate}
                  onChange={(e) => setDefaultDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-semibold text-slate-800 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Default Payment Method
                </label>
                <select
                  value={defaultPaymentMethod}
                  onChange={(e) => {
                    const m = e.target.value as ExpensePaymentMethod;
                    setDefaultPaymentMethod(m);
                    setItems((prev) =>
                      prev.map((it) => ({ ...it, paymentMethod: m }))
                    );
                  }}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-semibold text-slate-800 shadow-sm"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section B: Expense Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>2. Expense Items &amp; Particulars ({items.length})</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enter individual materials, wages, or services incurred for this project
                </p>
              </div>

              {!expenseToEdit && (
                <button
                  type="button"
                  onClick={addItemRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-black hover:bg-slate-800 rounded-xl shadow-soft transition-all active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Item</span>
                </button>
              )}
            </div>

            {/* List of Item Cards */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-soft space-y-3 relative group"
                >
                  {/* Item Header / Top row */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-black text-white text-[11px] font-black">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {item.description ? item.description : `Expense Voucher ${index + 1}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {items.length > 1 && !expenseToEdit && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove this item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Main Grid: Category, Description, Amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    {/* Category Selector with Custom Category Support */}
                    <div className="sm:col-span-4 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Category <span className="text-rose-500">*</span>
                      </label>

                      {isAddingNewCategory === item.id ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in">
                          <input
                            type="text"
                            autoFocus
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateCustomCategory(item.id);
                              }
                            }}
                            placeholder="Enter new category name..."
                            className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-black font-semibold text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => handleCreateCustomCategory(item.id)}
                            className="px-2 py-1.5 text-xs font-bold text-white bg-black hover:bg-slate-800 rounded-xl"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNewCategory(null);
                              setNewCategoryName('');
                            }}
                            className="p-1.5 text-slate-400 hover:text-black rounded-lg"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <select
                            value={item.category}
                            onChange={(e) => {
                              if (e.target.value === '__NEW__') {
                                setIsAddingNewCategory(item.id);
                                setNewCategoryName('');
                              } else {
                                updateItem(item.id, { category: e.target.value });
                              }
                            }}
                            required
                            className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-semibold text-slate-800"
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                            <option value="__NEW__" className="font-bold text-indigo-700 bg-indigo-50">
                              ✨ + Add New Category...
                            </option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="sm:col-span-5 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Description / Particulars <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, { description: e.target.value })
                        }
                        placeholder="e.g. 50 bags OPC 53 Cement or Mason wages"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium text-slate-800"
                      />
                    </div>

                    {/* Amount */}
                    <div className="sm:col-span-3 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={item.amount}
                          onChange={(e) =>
                            updateItem(item.id, { amount: e.target.value })
                          }
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 text-xs font-bold font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Secondary Details: Payment Method, Notes, and Receipt */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 text-xs">
                    {/* Payment Method */}
                    <div className="sm:col-span-3 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Method
                      </label>
                      <select
                        value={item.paymentMethod}
                        onChange={(e) =>
                          updateItem(item.id, {
                            paymentMethod: e.target.value as ExpensePaymentMethod,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black text-slate-700"
                      >
                        {PAYMENT_METHODS.map((pm) => (
                          <option key={pm} value={pm}>
                            {pm}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Notes */}
                    <div className="sm:col-span-6 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Notes / Bill Ref (Optional)
                      </label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) =>
                          updateItem(item.id, { notes: e.target.value })
                        }
                        placeholder="Supplier invoice #, vendor name, or remarks..."
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black text-slate-700"
                      />
                    </div>

                    {/* Receipt Upload / Preview */}
                    <div className="sm:col-span-3 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Receipt / Bill
                      </label>
                      {item.receiptUrl ? (
                        <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 border border-slate-200 rounded-xl">
                          <img
                            src={item.receiptUrl}
                            alt="Receipt"
                            className="w-6 h-6 object-cover rounded-lg border border-slate-300 shrink-0"
                          />
                          <span className="text-[10px] font-semibold text-slate-700 truncate flex-1">
                            Attached
                          </span>
                          <button
                            type="button"
                            onClick={() => updateItem(item.id, { receiptUrl: '' })}
                            className="text-rose-500 hover:text-rose-700 p-0.5"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors text-slate-600">
                          <Upload className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[10px] font-semibold">Upload Photo</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            onChange={(e) => handleReceiptFileChange(item.id, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Row Button */}
            {!expenseToEdit && (
              <button
                type="button"
                onClick={addItemRow}
                className="w-full py-2.5 px-4 border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-2xl text-xs font-bold text-slate-600 flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Another Expense Item</span>
              </button>
            )}
          </div>

          {/* Section C: Live Commercial Summary Bar */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10 text-white">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Batch Calculation Summary
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  {items.length} Expense Item{items.length > 1 ? 's' : ''} to be logged for{' '}
                  <span className="text-white font-bold underline">
                    {projectName || 'Selected Project'}
                  </span>
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Expenditure
              </span>
              <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 sticky bottom-0 bg-white py-2 z-10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-black bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft hover:shadow-premium transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {expenseToEdit
                  ? 'Save Changes'
                  : items.length > 1
                  ? `Record All ${items.length} Expenses (${formatCurrency(totalAmount)})`
                  : `Record Expense (${formatCurrency(totalAmount)})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
