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
} from 'lucide-react';
import { expenseService, clientService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Client, Expense, ExpenseCategory, ExpensePaymentMethod } from '../../types';

interface ExpenseModalProps {
  isOpen: boolean;
  expenseToEdit?: Expense | null;
  preselectedClientId?: string;
  preselectedProjectName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: ExpenseCategory[] = [
  'Labour Charges',
  'Material Purchase',
  'Transportation',
  'Equipment Rental',
  'Food & Accommodation',
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

  // Form State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [projectLocation, setProjectLocation] = useState<string>('');
  const [isCustomProject, setIsCustomProject] = useState<boolean>(false);
  const [category, setCategory] = useState<ExpenseCategory>('Material Purchase');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('Cash');
  const [notes, setNotes] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');

  // Load clients list on mount / open
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

      if (expenseToEdit) {
        const cid =
          typeof expenseToEdit.clientId === 'object'
            ? expenseToEdit.clientId._id
            : expenseToEdit.clientId;
        setSelectedClientId(cid);
        setProjectName(expenseToEdit.projectName || '');
        setProjectLocation(expenseToEdit.projectLocation || '');
        setCategory(expenseToEdit.category || 'Material Purchase');
        setDescription(expenseToEdit.description || '');
        setAmount(String(expenseToEdit.amount || ''));
        if (expenseToEdit.expenseDate) {
          setExpenseDate(new Date(expenseToEdit.expenseDate).toISOString().split('T')[0]);
        }
        setPaymentMethod(expenseToEdit.paymentMethod || 'Cash');
        setNotes(expenseToEdit.notes || '');
        setReceiptUrl(expenseToEdit.receiptUrl || '');
        setIsCustomProject(false);
      } else {
        setSelectedClientId(preselectedClientId || '');
        setProjectName(preselectedProjectName || '');
        setProjectLocation('');
        setCategory('Material Purchase');
        setDescription('');
        setAmount('');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('Cash');
        setNotes('');
        setReceiptUrl('');
        setIsCustomProject(Boolean(preselectedProjectName));
      }
    }
  }, [isOpen, expenseToEdit, preselectedClientId, preselectedProjectName]);

  // When client changes, fetch associated projects
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

  // Handle receipt image upload
  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Receipt file size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReceiptUrl(reader.result);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read receipt file.');
    };
    reader.readAsDataURL(file);
  };

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
    if (!description.trim()) {
      toast.error('Please enter the expense description.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid expense amount greater than zero.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        clientId: selectedClientId,
        projectName: projectName.trim(),
        projectLocation: projectLocation.trim(),
        category,
        description: description.trim(),
        amount: parsedAmount,
        expenseDate,
        paymentMethod,
        notes: notes.trim(),
        receiptUrl: receiptUrl.trim(),
      };

      if (expenseToEdit) {
        await expenseService.updateExpense(expenseToEdit._id, payload);
        toast.success('Expense record updated successfully.');
      } else {
        await expenseService.createExpense(payload);
        toast.success('Project expense recorded successfully.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-black text-white shadow-soft">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {expenseToEdit ? 'Edit Project Expense' : 'Record Project Expense'}
              </h3>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-semibold text-slate-800"
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
                  {isCustomProject ? '← Select from Client Projects' : '+ Enter New Project Name'}
                </button>
              )}
            </div>

            {loadingProjects ? (
              <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading projects associated with client...</span>
              </div>
            ) : isCustomProject || availableProjects.length === 0 ? (
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. DLF Cyber Structural Core Tower"
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-semibold text-slate-800"
                />
                <input
                  type="text"
                  value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)}
                  placeholder="Project Site Location (Optional, e.g. Tuvvur, Malappuram)"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-slate-400"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={projectName}
                  onChange={(e) => {
                    const chosen = availableProjects.find((p) => p.projectName === e.target.value);
                    setProjectName(e.target.value);
                    if (chosen?.projectLocation) {
                      setProjectLocation(chosen.projectLocation);
                    }
                  }}
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-semibold text-slate-800"
                >
                  <option value="">-- Select Client Project --</option>
                  {availableProjects.map((p) => (
                    <option key={p.projectName} value={p.projectName}>
                      {p.projectName} {p.projectLocation ? `(${p.projectLocation})` : ''}
                    </option>
                  ))}
                </select>
                {projectLocation && (
                  <p className="text-[11px] text-slate-500 font-medium px-1">
                    Site Location: <span className="font-semibold text-slate-700">{projectLocation}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Category & Amount in 2-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Expense Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                required
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-semibold text-slate-800"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 text-xs font-bold font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Description / Particulars <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 50 bags OPC 53 Grade Cement or Daily mason labour payment"
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-slate-800"
            />
          </div>

          {/* Date & Payment Method in 2-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Expense Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-semibold text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                required
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-semibold text-slate-800"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Notes / Vendor Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add bill reference number, supplier contact, or remarks..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black text-slate-800 resize-none"
            />
          </div>

          {/* Receipt / Bill Attachment */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Receipt / Voucher Attachment (Optional)
            </label>
            {receiptUrl ? (
              <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden bg-white shrink-0">
                  <img
                    src={receiptUrl}
                    alt="Receipt Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">Receipt / Bill Attached</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Stored securely with expense audit</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptUrl('')}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Remove Receipt"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs font-bold text-slate-700">Click to upload bill / receipt photo</span>
                <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 5MB</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleReceiptFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft hover:shadow-premium transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{expenseToEdit ? 'Save Changes' : 'Record Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
