import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useOutletContext, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Building,
  UserPlus,
  Calendar,
  Percent,
  FileCheck,
  Save,
  HelpCircle,
  FileText,
  Calculator,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { clientService, invoiceService, settingsService, quotationService } from '../services/api';
import { Client, InvoiceItem, SupplyType, CompanySettings, Quotation } from '../types';
import {
  calculateItemAmount,
  calculateSubtotal,
  calculateDiscountAmount,
  calculateTaxableAmount,
  calculateGST,
  calculateGrandTotal,
} from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';
import { ClientModal } from '../components/clients/ClientModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { useToast } from '../context/ToastContext';

export const CreateInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const toast = useToast();
  const { onOpenSidebar } = useOutletContext<{ onOpenSidebar: () => void }>();

  const preselectedClientId = location.state?.preselectedClientId;
  const searchParams = new URLSearchParams(location.search);
  const fromQuotationId = searchParams.get('fromQuotation');
  const [sourceQuotationId, setSourceQuotationId] = useState<string | null>(fromQuotationId);
  const [sourceQuotationNumber, setSourceQuotationNumber] = useState<string>('');

  // Master Data
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [existingInvoiceNumber, setExistingInvoiceNumber] = useState<string>('');
  const [existingStatus, setExistingStatus] = useState<string>('Draft');

  // Client Selection
  const [selectedClientId, setSelectedClientId] = useState<string>(preselectedClientId || '');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Project Info
  const [projectName, setProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [workDetails, setWorkDetails] = useState('');

  // Invoice Meta
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [paymentTerms, setPaymentTerms] = useState('Payment due within 15 days of bill submission.');
  const [notes, setNotes] = useState('');

  // Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: 'Foundation & Structural RCC Civil Construction Work', quantity: 1, unit: 'Job', rate: 250000, amount: 250000 },
  ]);

  // Adjustments & Tax
  const [discountType, setDiscountType] = useState<'Fixed' | 'Percentage'>('Fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);

  // GST Settings
  const [isGstApplicable, setIsGstApplicable] = useState(true);
  const [gstRate, setGstRate] = useState<number>(18);
  const [supplyType, setSupplyType] = useState<SupplyType>('Intra-State');

  // Submit Action States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIssueConfirmOpen, setIsIssueConfirmOpen] = useState(false);

  // Load clients and settings
  useEffect(() => {
    Promise.all([clientService.getClients(), settingsService.getSettings()])
      .then(([clientsRes, settingsRes]) => {
        setClients(clientsRes.data.data);
        const setts: CompanySettings = settingsRes.data.data;
        setSettings(setts);

        if (setts.invoiceSettings?.defaultPaymentTerms) {
          setPaymentTerms(setts.invoiceSettings.defaultPaymentTerms);
        }
        if (setts.invoiceSettings?.defaultNotes) {
          setNotes(setts.invoiceSettings.defaultNotes);
        }
        if (setts.gstSettings) {
          setIsGstApplicable(setts.gstSettings.defaultApplicability);
          setSupplyType(setts.gstSettings.defaultSupplyType || 'Intra-State');
        }

        // Check if prefilling from an accepted quotation
        if (fromQuotationId) {
          return quotationService.getQuotationById(fromQuotationId);
        }
        return null;
      })
      .then((qRes) => {
        if (qRes && qRes.data?.data) {
          const q: Quotation = qRes.data.data;
          setSourceQuotationId(q._id);
          setSourceQuotationNumber(q.quotationNumber);
          const cid = typeof q.clientId === 'object' ? (q.clientId as any)._id : q.clientId;
          setSelectedClientId(cid);
          setProjectName(q.projectName || '');
          setProjectLocation(q.projectLocation || '');
          setProjectDescription(q.projectDescription || '');
          setWorkDetails(q.workDetails || '');
          if (q.items && q.items.length > 0) setItems(q.items);
          if (q.discount) {
            setDiscountType(q.discount.type);
            setDiscountValue(q.discount.value);
          }
          if (q.additionalCharges) setAdditionalCharges(q.additionalCharges);
          if (q.estimatedGstDetails) {
            setIsGstApplicable(q.estimatedGstDetails.isApplicable);
            setGstRate(q.estimatedGstDetails.rate);
            setSupplyType(q.estimatedGstDetails.supplyType);
          }
          if (q.paymentTerms) setPaymentTerms(q.paymentTerms);
          toast.success(`Pre-filled from accepted Quotation ${q.quotationNumber}!`);
        }
      })
      .catch((err) => {
        toast.error('Failed to load initial form configuration');
      })
      .finally(() => setLoadingInitial(false));
  }, []);

  // Fetch invoice details if in edit mode
  useEffect(() => {
    if (id) {
      invoiceService
        .getInvoiceById(id)
        .then((res) => {
          const inv = res.data.data;
          setExistingInvoiceNumber(inv.invoiceNumber);
          setExistingStatus(inv.status);
          const cid = typeof inv.clientId === 'object' ? inv.clientId._id : inv.clientId;
          setSelectedClientId(cid);
          setProjectName(inv.projectName || '');
          setProjectLocation(inv.projectLocation || '');
          setProjectDescription(inv.projectDescription || '');
          setWorkDetails(inv.workDetails || '');
          if (inv.invoiceDate) {
            setInvoiceDate(new Date(inv.invoiceDate).toISOString().split('T')[0]);
          }
          if (inv.dueDate) {
            setDueDate(new Date(inv.dueDate).toISOString().split('T')[0]);
          }
          if (inv.paymentTerms) setPaymentTerms(inv.paymentTerms);
          if (inv.notes) setNotes(inv.notes);
          if (inv.items && inv.items.length) {
            setItems(inv.items);
          }
          if (inv.discount) {
            setDiscountType(inv.discount.type || 'Fixed');
            setDiscountValue(inv.discount.value || 0);
          }
          if (inv.additionalCharges !== undefined) {
            setAdditionalCharges(inv.additionalCharges);
          }
          if (inv.gstDetails) {
            setIsGstApplicable(inv.gstDetails.isApplicable);
            setGstRate(inv.gstDetails.rate || 18);
            setSupplyType(inv.gstDetails.supplyType || 'Intra-State');
          }
        })
        .catch(() => {
          toast.error('Failed to load invoice for editing');
        });
    }
  }, [id]);

  const selectedClient = clients.find((c) => c._id === selectedClientId);

  // Auto-detect supply type based on supplier state and client state
  useEffect(() => {
    if (selectedClient && settings?.gstSettings?.supplierState) {
      const supplierState = settings.gstSettings.supplierState.trim().toLowerCase();
      const clientState = selectedClient.state.trim().toLowerCase();
      if (supplierState === clientState) {
        setSupplyType('Intra-State');
      } else {
        setSupplyType('Inter-State');
      }
    }
  }, [selectedClient, settings]);

  // Handle item change
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'rate') {
      current.amount = calculateItemAmount(current.quantity, current.rate);
    }

    updated[index] = current;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { description: '', quantity: 1, unit: 'Units', rate: 0, amount: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.info('Invoice must contain at least one item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = calculateSubtotal(items);
  const discountAmount = calculateDiscountAmount(subtotal, discountValue, discountType);
  const taxableAmount = calculateTaxableAmount(subtotal, discountAmount, additionalCharges);
  const gstBreakdown = calculateGST(taxableAmount, isGstApplicable, gstRate, supplyType);
  const grandTotal = calculateGrandTotal(taxableAmount, gstBreakdown.totalTax);

  const validateForm = () => {
    if (!selectedClientId) {
      toast.error('Please select or add a client.');
      return false;
    }
    if (!projectName.trim()) {
      toast.error('Please enter the project name.');
      return false;
    }
    if (items.some((item) => !item.description.trim() || item.quantity <= 0)) {
      toast.error('All items must have a valid description and quantity greater than zero.');
      return false;
    }
    return true;
  };

  const handleSaveInvoice = async (status: 'Draft' | 'Issued') => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        clientId: selectedClientId,
        projectName: projectName.trim(),
        projectLocation: projectLocation.trim(),
        projectDescription: projectDescription.trim(),
        workDetails: workDetails.trim(),
        items,
        discount: {
          type: discountType,
          value: Number(discountValue) || 0,
        },
        additionalCharges: Number(additionalCharges) || 0,
        gstDetails: {
          isApplicable: isGstApplicable,
          rate: Number(gstRate) || 0,
          supplyType,
        },
        invoiceDate,
        dueDate,
        paymentTerms,
        notes,
        status: isEditMode ? existingStatus : status,
        sourceQuotationId: sourceQuotationId || undefined,
        sourceQuotationNumber: sourceQuotationNumber || undefined,
      };

      if (isEditMode) {
        await invoiceService.updateInvoice(id!, payload);
        toast.success('Invoice updated successfully!');
        navigate(`/invoices/${id}`);
      } else {
        const res = await invoiceService.createInvoice(payload);
        const newInvoice = res.data.data;
        toast.success(status === 'Issued' ? 'Invoice officially issued!' : 'Draft invoice saved.');
        navigate(`/invoices/${newInvoice._id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || (isEditMode ? 'Failed to update invoice' : 'Failed to create invoice'));
    } finally {
      setIsSubmitting(false);
      setIsIssueConfirmOpen(false);
    }
  };

  return (
    <>
      <Header
        onOpenSidebar={onOpenSidebar}
        title={isEditMode ? `Edit Invoice: ${existingInvoiceNumber}` : 'Create New Project Invoice'}
        subtitle={
          isEditMode
            ? 'Modify project details, work items or tax configurations'
            : 'Configure client particulars, work items, and verified GST computation'
        }
      />

      <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full pb-24">
        {/* Top Back Link */}
        <div className="flex items-center justify-between">
          <Link
            to={isEditMode ? `/invoices/${id}` : '/invoices'}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isEditMode ? 'Back to Invoice Details' : 'Back to Invoices'}</span>
          </Link>

          <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-xl border border-brand-200">
            {isEditMode ? existingInvoiceNumber : `Preview #${settings?.invoiceSettings?.prefix || 'INV-2026'}-XXX`}
          </span>
        </div>

        {sourceQuotationNumber && (
          <div className="p-4 rounded-2xl bg-black text-white flex items-center justify-between shadow-soft">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold">
                  Converting Quotation <span className="font-mono text-emerald-400">{sourceQuotationNumber}</span> into Tax Invoice
                </p>
                <p className="text-[11px] text-slate-400">
                  Client, project scope, line items &amp; rates have been auto-populated. Confirm tax treatment and issue invoice.
                </p>
              </div>
            </div>
            {sourceQuotationId && (
              <Link
                to={`/quotations/${sourceQuotationId}`}
                target="_blank"
                className="text-xs text-slate-300 underline hover:text-white"
              >
                View Quotation
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section A: Client Information */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-brand-700" />
                  <h3 className="text-sm font-bold text-slate-900">Section A: Client Information</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add New Client</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Existing Client <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="">-- Choose a Client --</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.clientName} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {selectedClient && (
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-xs">
                  <p className="font-bold text-slate-900">{selectedClient.clientName}</p>
                  <p className="text-slate-600">
                    {selectedClient.billingAddress}, {selectedClient.city}, {selectedClient.state} - {selectedClient.pincode}
                  </p>
                  <p className="text-slate-600">
                    Phone: {selectedClient.phone} {selectedClient.gstin ? `| GSTIN: ${selectedClient.gstin}` : '| Unregistered'}
                  </p>
                </div>
              )}
            </div>

            {/* Section B: Project Information */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="w-4 h-4 text-brand-700" />
                <h3 className="text-sm font-bold text-slate-900">Section B: Project Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Project / Site Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. DLF Cyber Horizon Structural Core Tower"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Project Location / Site Address
                  </label>
                  <input
                    type="text"
                    value={projectLocation}
                    onChange={(e) => setProjectLocation(e.target.value)}
                    placeholder="e.g. Sector 24, Cyber City, Gurugram"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Project Scope / Reference ID
                  </label>
                  <input
                    type="text"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="e.g. RA Bill #04 (Foundation to 3rd Floor)"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Section C: Invoice Dates & Terms */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calendar className="w-4 h-4 text-brand-700" />
                <h3 className="text-sm font-bold text-slate-900">Section C: Dates & Payment Terms</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Invoice Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Due Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="e.g. Due within 15 days of invoice date."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Section D: Work Details & Item Table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-brand-700" />
                  <h3 className="text-sm font-bold text-slate-900">Section D: Construction Work & Materials</h3>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-brand-800 uppercase tracking-wider">
                        Item #{idx + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Work Description
                        </label>
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="e.g. Reinforced Cement Concrete M25 Piling & Casting"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Unit
                        </label>
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="Job">Job</option>
                          <option value="Lot">Lot</option>
                          <option value="Sq.Ft">Sq.Ft</option>
                          <option value="R.Mtr">R.Mtr</option>
                          <option value="Tons">Tons</option>
                          <option value="Bags">Bags</option>
                          <option value="Days">Days</option>
                          <option value="Nos">Nos</option>
                          <option value="Units">Units</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Rate (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={item.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <span className="text-mutedText">Line Total: </span>
                      <strong className="text-slate-900">{formatCurrency(item.amount)}</strong>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-brand-400 text-xs font-semibold text-slate-600 hover:text-brand-700 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Another Construction Item
              </button>
            </div>
          </div>

          {/* Right Column: GST Configuration & Live Calculation Summary */}
          <div className="space-y-6">
            {/* Section F: GST Configuration */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">GST Configuration</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGstApplicable}
                    onChange={(e) => setIsGstApplicable(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>

              {isGstApplicable ? (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      GST Rate Preset
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 12, 18, 28].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setGstRate(r)}
                          className={`py-2 font-bold rounded-xl border transition-all ${
                            gstRate === r
                              ? 'bg-brand-700 text-white border-brand-700 shadow-soft'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {r}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Supply Jurisdiction
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSupplyType('Intra-State')}
                        className={`p-2 rounded-xl text-left border transition-all ${
                          supplyType === 'Intra-State'
                            ? 'bg-brand-50 border-brand-500 text-brand-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <p className="font-bold">Intra-State</p>
                        <p className="text-[10px] text-mutedText">CGST ({gstRate / 2}%) + SGST ({gstRate / 2}%)</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSupplyType('Inter-State')}
                        className={`p-2 rounded-xl text-left border transition-all ${
                          supplyType === 'Inter-State'
                            ? 'bg-brand-50 border-brand-500 text-brand-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <p className="font-bold">Inter-State</p>
                        <p className="text-[10px] text-mutedText">IGST ({gstRate}%)</p>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-mutedText italic">
                  GST is toggled off. Invoice will be issued as a Bill of Supply with 0% tax.
                </p>
              )}
            </div>

            {/* Adjustments: Discount & Additional Charges */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Adjustments & Charges
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-slate-700 uppercase tracking-wider">
                      Discount
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDiscountType('Fixed')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          discountType === 'Fixed' ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Fixed (₹)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('Percentage')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          discountType === 'Percentage' ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Additional Charges (e.g. Crane, Logistics)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={additionalCharges}
                    onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Live Financial Summary */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-premium space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Live Calculation Summary
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span>- {formatCurrency(discountAmount)}</span>
                  </div>
                )}

                {additionalCharges > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Additional Charges:</span>
                    <span>+ {formatCurrency(additionalCharges)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-900 font-bold pt-2 border-t border-slate-100">
                  <span>Taxable Amount:</span>
                  <span>{formatCurrency(taxableAmount)}</span>
                </div>

                {/* Tax Breakdown */}
                {gstBreakdown.isApplicable && (
                  <div className="p-3 bg-brand-50/50 rounded-xl space-y-1.5 text-[11px] border border-brand-100">
                    {gstBreakdown.supplyType === 'Inter-State' ? (
                      <div className="flex justify-between text-brand-900">
                        <span>IGST ({gstBreakdown.igstRate}%):</span>
                        <span className="font-semibold">{formatCurrency(gstBreakdown.igstAmount)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-brand-900">
                          <span>CGST ({gstBreakdown.cgstRate}%):</span>
                          <span className="font-semibold">{formatCurrency(gstBreakdown.cgstAmount)}</span>
                        </div>
                        <div className="flex justify-between text-brand-900">
                          <span>SGST ({gstBreakdown.sgstRate}%):</span>
                          <span className="font-semibold">{formatCurrency(gstBreakdown.sgstAmount)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Grand Total */}
                <div className="p-4 bg-brand-900 text-white rounded-xl flex items-center justify-between mt-4">
                  <div>
                    <p className="text-[10px] text-brand-200 font-bold uppercase tracking-wider">Grand Total</p>
                    <p className="text-xl font-extrabold">{formatCurrency(grandTotal)}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-2.5">
                {isEditMode ? (
                  <button
                    type="button"
                    onClick={() => handleSaveInvoice(existingStatus as any)}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft hover:shadow-premium transition-all disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmitting ? 'Saving Changes...' : 'Save & Update Invoice'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsIssueConfirmOpen(true)}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft hover:shadow-premium transition-all disabled:opacity-50"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>Issue Official Invoice</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveInvoice('Draft')}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save as Draft</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal for adding a client directly inside invoice creation */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={(newClient) => {
          setClients((prev) => [newClient, ...prev]);
          setSelectedClientId(newClient._id);
        }}
      />

      {/* Issue Confirmation Modal */}
      <ConfirmationModal
        isOpen={isIssueConfirmOpen}
        title="Confirm Official Invoice Issuance"
        message="Issuing this invoice creates a permanent financial document and locks company tax snapshot. Are you sure all work items and amounts are verified?"
        confirmLabel="Issue Official Invoice"
        cancelLabel="Review Again"
        isLoading={isSubmitting}
        onConfirm={() => handleSaveInvoice('Issued')}
        onClose={() => setIsIssueConfirmOpen(false)}
      />
    </>
  );
};

