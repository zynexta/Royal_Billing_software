import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  UserPlus,
  Calendar,
  Save,
  ClipboardList,
  Send,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { clientService, quotationService, settingsService } from '../services/api';
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
import { useToast } from '../context/ToastContext';

export const CreateQuotationPage: React.FC = () => {
  const { onOpenSidebar } = useOutletContext<{ onOpenSidebar: () => void }>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const toast = useToast();

  // Master Data
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [existingQuotationNumber, setExistingQuotationNumber] = useState<string>('');

  // Client Selection
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Project Info
  const [projectName, setProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [workCategory, setWorkCategory] = useState('');
  const [workDetails, setWorkDetails] = useState('');

  // Quotation Meta
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [paymentTerms, setPaymentTerms] = useState(
    'Mobilization Advance: 30% | Running Work: 60% | Final Handover: 10%'
  );
  const [paymentSchedule, setPaymentSchedule] = useState(
    'Mobilization Advance: 30% | Running Work: 60% | Final Handover: 10%'
  );
  const [termsAndConditions, setTermsAndConditions] = useState(
    '• Rates quoted are valid for 30 days from date of issue.\n• Taxes are estimated and applicable as per prevailing GST rules upon final tax invoice generation.\n• Extra items or structural scope variations will be billed separately upon mutual consent.\n• Mobilization will commence upon acceptance & advance payment.'
  );
  const [notes, setNotes] = useState(
    'We appreciate the opportunity to submit our cost proposal for your esteemed project.'
  );

  // Construction Specifications, Inclusions & Declaration (Client Reference Inspired)
  const [remarks, setRemarks] = useState(
    "All works shall comply with the manufacturer's recommendations and warranty requirements. Site inspections by the manufacturer's technical team shall be arranged as required to ensure warranty compliance."
  );
  const [declaration, setDeclaration] = useState(
    'We hereby declare that the total estimated quotation amount includes all materials, labour, tools, and accessories required to complete the work to the highest standards, ensuring quality and meeting your expectations.'
  );
  const [materialInclusions, setMaterialInclusions] = useState('Putty, primer, paint, chemical sealants, adhesives');
  const [labourInclusions, setLabourInclusions] = useState('Surface preparation, machine sanding, primer application, site cleaning');
  const [exclusions, setExclusions] = useState('Major structural repairs, high-reach scaffolding beyond agreed limits');

  // Items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      area: 'Interior Wall With Luxury Finish',
      description: '- One coat Cement Based Coarse Putty\n- Two coat Cement Based Fine Putty sanding by Machine\n- Chemical Treatment\n- One coat Alkali resistance Primer by Roller',
      quantity: 1,
      unit: 'Job',
      rate: 140000,
      amount: 140000,
    },
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

  // Load clients, settings & existing quotation if edit mode
  useEffect(() => {
    Promise.all([clientService.getClients(), settingsService.getSettings()])
      .then(([clientsRes, settingsRes]) => {
        setClients(clientsRes.data?.data || []);
        const setts: CompanySettings = settingsRes.data?.data;
        setSettings(setts);

        if (setts?.quotationSettings?.defaultPaymentTerms) {
          setPaymentTerms(setts.quotationSettings.defaultPaymentTerms);
        }
        if (setts?.quotationSettings?.termsAndConditions) {
          setTermsAndConditions(setts.quotationSettings.termsAndConditions);
        }
        if (setts?.quotationSettings?.defaultNotes) {
          setNotes(setts.quotationSettings.defaultNotes);
        }

        // If editing existing quotation
        if (isEditMode && id) {
          return quotationService.getQuotationById(id);
        }
        return null;
      })
      .then((qRes) => {
        if (qRes && qRes.data?.data) {
          const q: Quotation = qRes.data.data;
          setExistingQuotationNumber(q.quotationNumber);
          setSelectedClientId(
            typeof q.clientId === 'object' ? (q.clientId as any)._id : q.clientId
          );
          setProjectName(q.projectName || '');
          setProjectLocation(q.projectLocation || '');
          setProjectDescription(q.projectDescription || '');
          if (q.workCategory) setWorkCategory(q.workCategory);
          setWorkDetails(q.workDetails || '');
          setQuotationDate(new Date(q.quotationDate).toISOString().split('T')[0]);
          setValidUntil(new Date(q.validUntil).toISOString().split('T')[0]);
          if (q.paymentTerms) setPaymentTerms(q.paymentTerms);
          if (q.paymentSchedule) setPaymentSchedule(q.paymentSchedule);
          if (q.termsAndConditions) setTermsAndConditions(q.termsAndConditions);
          if (q.remarks) setRemarks(q.remarks);
          if (q.declaration) setDeclaration(q.declaration);
          if (q.materialInclusions) setMaterialInclusions(q.materialInclusions);
          if (q.labourInclusions) setLabourInclusions(q.labourInclusions);
          if (q.exclusions) setExclusions(q.exclusions);
          if (q.notes) setNotes(q.notes);
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
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Failed to load initial data');
      })
      .finally(() => {
        setLoadingInitial(false);
      });
  }, [id, isEditMode]);

  // Selected Client
  const selectedClient = clients.find((c) => c._id === selectedClientId);

  // When client is newly created inline
  const handleClientCreated = (newClient: Client) => {
    setClients((prev) => [newClient, ...prev]);
    setSelectedClientId(newClient._id);
    setIsClientModalOpen(false);
    toast.success(`Client ${newClient.clientName} added and selected`);
  };

  // Calculations
  const calculatedItems = items.map((it) => ({
    ...it,
    amount: calculateItemAmount(it.quantity, it.rate),
  }));

  const subtotal = calculateSubtotal(calculatedItems);
  const discountAmount = calculateDiscountAmount(subtotal, discountValue, discountType);
  const taxableAmount = calculateTaxableAmount(subtotal, discountAmount, additionalCharges);
  const gstBreakdown = calculateGST(taxableAmount, isGstApplicable, gstRate, supplyType);
  const estimatedGrandTotal = calculateGrandTotal(taxableAmount, gstBreakdown.totalTax);

  // Item Handlers
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { area: '', description: '', quantity: 1, unit: 'Job', rate: 0, amount: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error('A quotation must contain at least one line item');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Submission handler
  const handleSaveQuotation = async (statusToSet: 'Draft' | 'Sent') => {
    if (!selectedClientId) {
      toast.error('Please select or create a client');
      return;
    }
    if (!projectName.trim()) {
      toast.error('Project Name is required');
      return;
    }
    const hasEmptyItem = items.some((it) => !it.description.trim() || it.rate <= 0);
    if (hasEmptyItem) {
      toast.error('All work items must have a description and rate greater than 0');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        clientId: selectedClientId,
        projectName: projectName.trim(),
        projectLocation: projectLocation.trim(),
        projectDescription: projectDescription.trim(),
        workCategory: workCategory.trim(),
        workDetails: workDetails.trim(),
        items: calculatedItems,
        discount: {
          type: discountType,
          value: Number(discountValue) || 0,
        },
        additionalCharges: Number(additionalCharges) || 0,
        estimatedGstDetails: {
          isApplicable: isGstApplicable,
          rate: gstRate,
          supplyType,
        },
        quotationDate,
        validUntil,
        paymentTerms,
        paymentSchedule,
        termsAndConditions,
        remarks: remarks.trim(),
        declaration: declaration.trim(),
        materialInclusions: materialInclusions.trim(),
        labourInclusions: labourInclusions.trim(),
        exclusions: exclusions.trim(),
        notes,
        status: statusToSet,
      };

      if (isEditMode && id) {
        await quotationService.updateQuotation(id, payload);
        toast.success('Quotation updated successfully');
        navigate(`/quotations/${id}`);
      } else {
        const res = await quotationService.createQuotation(payload);
        const newQ = res.data?.data;
        toast.success(
          statusToSet === 'Sent'
            ? `Quotation ${newQ.quotationNumber} issued to client!`
            : `Quotation ${newQ.quotationNumber} saved as draft!`
        );
        navigate(`/quotations/${newQ._id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="p-16 text-center text-xs text-slate-500">
        Loading quotation workspace...
      </div>
    );
  }

  return (
    <>
      <Header
        onOpenSidebar={onOpenSidebar}
        title={isEditMode ? `Edit Quotation ${existingQuotationNumber}` : 'New Commercial Quotation'}
        subtitle="Prepare itemized civil estimate, scope specifications & calculate GST"
        showDefaultActions={false}
      />

      <main className="p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full pb-24">
        {/* Top Header & Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/quotations')}
              className="p-2 text-slate-500 hover:text-black hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-black text-white">
                  <ClipboardList className="w-3.5 h-3.5" />
                </span>
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  {isEditMode ? `Edit Quotation ${existingQuotationNumber}` : 'New Cost Quotation'}
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate a formal cost estimate for client review &amp; WhatsApp approval
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveQuotation('Draft')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-soft"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveQuotation('Sent')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-black hover:bg-slate-800 rounded-xl shadow-soft transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Issue Quotation</span>
            </button>
          </div>
        </div>

        {/* SECTION A: CLIENT DETAILS */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900">Section A — Client Information</h2>
              <p className="text-xs text-slate-500 font-medium">
                Select an existing client or register a new client inline
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsClientModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add New Client</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Client *
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              >
                <option value="">-- Choose a Client --</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.clientName} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedClient && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                <div className="font-bold text-slate-900">{selectedClient.clientName}</div>
                {selectedClient.contactPerson && (
                  <div className="text-slate-600">Attn: {selectedClient.contactPerson}</div>
                )}
                <div className="text-slate-500">
                  {selectedClient.billingAddress}, {selectedClient.city}, {selectedClient.state} -{' '}
                  {selectedClient.pincode}
                </div>
                <div className="font-mono text-slate-600">
                  Ph: {selectedClient.phone}{' '}
                  {selectedClient.gstin ? `| GSTIN: ${selectedClient.gstin}` : ''}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION B: PROJECT DETAILS */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900">Section B — Project Particulars</h2>
            <p className="text-xs text-slate-500 font-medium">
              Specify the site location and construction scope of work
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Skyline Residency Tower B"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Project Location / Site Address
              </label>
              <input
                type="text"
                value={projectLocation}
                onChange={(e) => setProjectLocation(e.target.value)}
                placeholder="e.g. Plot 42, Sector 12, Malappuram"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Work Category / Trade
              </label>
              <input
                type="text"
                value={workCategory}
                onChange={(e) => setWorkCategory(e.target.value)}
                placeholder="e.g. Painting, Finishing, Civil RCC"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Project Scope / Scope Overview
              </label>
              <textarea
                rows={2}
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="e.g. Turnkey painting and finishing work including surface preparation, machine putty sanding, and primer application."
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION C: QUOTATION METADATA */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900">Section C — Quotation Information</h2>
            <p className="text-xs text-slate-500 font-medium">
              Timeline, validity period, and proposed payment terms
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Quotation Date *
              </label>
              <input
                type="date"
                required
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Valid Until *
              </label>
              <input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Payment Schedule / Terms
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. 30% Advance, 60% Progress, 10% Handover"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION D: DETAILED WORK DESCRIPTION TABLE */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Section D — Detailed Work &amp; Area Specifications
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Specify work areas, multi-line scope descriptions, quantity and estimated cost
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Work Item</span>
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-black text-white text-[11px] font-black font-mono flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Work Item #{idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-xs text-right">
                      <span className="text-slate-400 font-medium">Item Amount: </span>
                      <span className="font-mono font-black text-slate-900 text-sm">
                        {formatCurrency(calculateItemAmount(item.quantity, item.rate))}
                      </span>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove work item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Work / Area */}
                  <div className="md:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Work / Area *
                    </label>
                    <input
                      type="text"
                      required
                      value={item.area || ''}
                      onChange={(e) => handleItemChange(idx, 'area', e.target.value)}
                      placeholder="e.g. Interior Wall With Luxury Finish"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  {/* Unit */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      placeholder="Job / Sq.ft"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-center focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  {/* Rate */}
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Rate (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={item.rate}
                      onChange={(e) =>
                        handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-right font-mono focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  {/* Description of Work / Scope (Multi-line) */}
                  <div className="md:col-span-12">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Description of Work / Detailed Specifications (Multi-line bullet points) *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      placeholder={`e.g.\n- One coat Cement Based Coarse Putty (handle deep surface imperfections)\n- Two coat Cement Based Fine Putty sanding by Machine (For ultra-smooth profile)\n- Chemical Treatment\n- One coat Alkali resistance Primer by Roller`}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-black leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION E: REMARKS, INCLUSIONS & DECLARATION */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900">
              Section E — Remarks, Inclusions &amp; Declaration
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Configure project remarks, material/labour inclusions, exclusions, and proposal declaration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Remarks (Manufacturer &amp; Warranty Compliance)
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. All works shall comply with the manufacturer's recommendations and warranty requirements..."
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Material Inclusions
              </label>
              <input
                type="text"
                value={materialInclusions}
                onChange={(e) => setMaterialInclusions(e.target.value)}
                placeholder="e.g. Putty, primer, paints, chemical sealants, adhesives"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Labour Inclusions
              </label>
              <input
                type="text"
                value={labourInclusions}
                onChange={(e) => setLabourInclusions(e.target.value)}
                placeholder="e.g. Surface preparation, machine sanding, primer application"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Exclusions (Scope Limitations)
              </label>
              <input
                type="text"
                value={exclusions}
                onChange={(e) => setExclusions(e.target.value)}
                placeholder="e.g. Major structural brickwork repairs, high-reach scaffolding beyond 3 floors"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Formal Quotation Declaration *
              </label>
              <textarea
                rows={2}
                required
                value={declaration}
                onChange={(e) => setDeclaration(e.target.value)}
                placeholder="We hereby declare that the total estimated quotation amount includes..."
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION F: GST ESTIMATION & FINANCIAL SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GST Configuration Box */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900">Section F — GST Estimation</h2>
              <p className="text-xs text-slate-500 font-medium">
                Configure estimated tax calculation (finalized on Tax Invoice)
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-xs font-bold text-slate-800">GST Applicable</span>
                  <p className="text-[11px] text-slate-500">Enable GST computation on this estimate</p>
                </div>
                <input
                  type="checkbox"
                  checked={isGstApplicable}
                  onChange={(e) => setIsGstApplicable(e.target.checked)}
                  className="w-4 h-4 text-black rounded border-slate-300 focus:ring-black"
                />
              </div>

              {isGstApplicable && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">GST Rate</label>
                    <select
                      value={gstRate}
                      onChange={(e) => setGstRate(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
                    >
                      <option value={18}>18% (Standard Civil Construction)</option>
                      <option value={12}>12% (Concessional / Govt)</option>
                      <option value={5}>5% (Material / Low-Cost)</option>
                      <option value={28}>28% (Luxury / Specific Items)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Supply Type</label>
                    <select
                      value={supplyType}
                      onChange={(e) => setSupplyType(e.target.value as SupplyType)}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
                    >
                      <option value="Intra-State">Intra-State (CGST + SGST)</option>
                      <option value="Inter-State">Inter-State (IGST)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Discount / Deductions */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'Fixed' | 'Percentage')}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
                  >
                    <option value="Fixed">Fixed Amount (₹)</option>
                    <option value="Percentage">Percentage (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Discount Value {discountType === 'Percentage' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900">Estimated Financial Summary</h2>
              <p className="text-xs text-slate-500 font-medium">
                Live calculated totals for this quotation
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-slate-600">
                  <span>Discount</span>
                  <span className="font-mono font-bold text-rose-600">
                    - {formatCurrency(discountAmount)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-600">
                <span>Taxable Amount</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(taxableAmount)}</span>
              </div>

              {gstBreakdown.isApplicable && gstBreakdown.totalTax > 0 && (
                <>
                  {gstBreakdown.supplyType === 'Inter-State' ? (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Indicative IGST ({gstBreakdown.rate}%)</span>
                      <span className="font-mono text-slate-900">{formatCurrency(gstBreakdown.igstAmount)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Indicative CGST ({gstBreakdown.cgstRate}%)</span>
                        <span className="font-mono text-slate-900">
                          {formatCurrency(gstBreakdown.cgstAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Indicative SGST ({gstBreakdown.sgstRate}%)</span>
                        <span className="font-mono text-slate-900">
                          {formatCurrency(gstBreakdown.sgstAmount)}
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="p-4 rounded-2xl bg-black text-white flex items-center justify-between mt-4 shadow-soft">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                    Estimated Grand Total
                  </p>
                  <p className="text-lg font-black font-mono">
                    {formatCurrency(estimatedGrandTotal)}
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 text-right max-w-[140px]">
                  Estimated cost proposal
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION G: TERMS & CONDITIONS */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900">Section G — Terms &amp; Conditions</h2>
            <p className="text-xs text-slate-500 font-medium">
              Standard commercial conditions and proposal notes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Quotation Terms &amp; Conditions
              </label>
              <textarea
                rows={4}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Special Notes / Remarks
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-medium"
              />
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate('/quotations')}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-black hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSaveQuotation('Draft')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-soft"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSaveQuotation('Sent')}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-black hover:bg-slate-800 rounded-xl shadow-soft transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Issue &amp; Finalize Quotation</span>
          </button>
        </div>
      </main>

      {/* Inline Client Creation Modal */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={handleClientCreated}
      />
    </>
  );
};
