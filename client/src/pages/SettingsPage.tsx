import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Building,
  FileText,
  Percent,
  Landmark,
  Save,
  CheckCircle2,
  FileSignature,
  Upload,
  RotateCcw,
  Eraser,
  PenTool,
  Info,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { settingsService } from '../services/api';
import { CompanySettings } from '../types';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const { onOpenSidebar } = useOutletContext<{ onOpenSidebar: () => void }>();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'company' | 'invoice' | 'signature' | 'bank' | 'gst'>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CompanySettings | null>(null);

  // Signature canvas ref & drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await settingsService.getSettings();
      setFormData(res.data.data);
    } catch (err: any) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    try {
      setSaving(true);
      await settingsService.updateCompany(formData.companyProfile);
      toast.success('Company identity & branding updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save company profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    try {
      setSaving(true);
      await settingsService.updateInvoiceSettings(formData.invoiceSettings);
      toast.success('Invoice preferences & Terms & Conditions updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save invoice settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    try {
      setSaving(true);
      await settingsService.updateInvoiceSettings(formData.invoiceSettings);
      toast.success('Signatory credentials & signature saved successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save signature settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGST = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    try {
      setSaving(true);
      await settingsService.updateGSTSettings(formData.gstSettings);
      toast.success('GST tax configuration updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save GST settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    try {
      setSaving(true);
      await settingsService.updateBankDetails(formData.bankDetails);
      toast.success('Bank & UPI remittance details updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  // Logo upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo image must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData({
          ...formData,
          companyProfile: {
            ...formData.companyProfile,
            logo: reader.result,
          },
        });
        toast.info('Logo preview updated. Click "Save Company Profile" to persist.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Signature image upload handler
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Signature image must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData({
          ...formData,
          invoiceSettings: {
            ...formData.invoiceSettings,
            signatureImage: reader.result,
          },
        });
        toast.info('Custom signature uploaded. Click "Save Signatory Settings" to save.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Interactive Signature Pad Helpers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const applyDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !formData) return;
    const dataUrl = canvas.toDataURL('image/png');
    setFormData({
      ...formData,
      invoiceSettings: {
        ...formData.invoiceSettings,
        signatureImage: dataUrl,
      },
    });
    toast.success('Drawn signature applied to preview! Click "Save Signatory Settings" to save.');
  };

  if (loading || !formData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-xs text-mutedText">
        Loading enterprise configuration...
      </div>
    );
  }

  const tabs = [
    { id: 'company', label: 'Company Profile & Branding', icon: Building },
    { id: 'invoice', label: 'Invoice & Terms', icon: FileText },
    { id: 'signature', label: 'Signatory & Signature', icon: FileSignature },
    { id: 'bank', label: 'Bank & UPI Accounts', icon: Landmark },
    { id: 'gst', label: 'GST Tax Matrix', icon: Percent },
  ];

  return (
    <>
      <Header
        onOpenSidebar={onOpenSidebar}
        title="Settings & Brand Configuration"
        subtitle="Manage company particulars, invoice terms, digital signature & payment defaults"
      />

      <main className="p-6 sm:p-8 space-y-6 max-w-5xl mx-auto w-full pb-24">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-soft overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-black text-white shadow-soft font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: COMPANY PROFILE & BRANDING                         */}
        {/* ========================================================= */}
        {activeTab === 'company' && (
          <form onSubmit={handleSaveCompany} className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-soft space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Company Identity & Registration</h3>
                  <p className="text-xs text-mutedText mt-0.5">
                    Printed at the header of all official invoices and PDF documents
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-semibold text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-800" />
                  <span>Official Billing Entity</span>
                </div>
              </div>

              {/* Logo & Branding Bar */}
              <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group">
                  <div className="w-20 h-20 bg-white border-2 border-slate-200 rounded-2xl p-2 shadow-sm flex items-center justify-center overflow-hidden">
                    <img
                      src={formData.companyProfile.logo || '/logo.png'}
                      alt="Company Logo Preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <h4 className="text-sm font-bold text-slate-900">Official Company Logo</h4>
                  <p className="text-xs text-mutedText max-w-md">
                    Displayed at the top-left of every PDF invoice. Recommended: PNG with transparent or white background.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-soft transition-colors">
                      <Upload className="w-3.5 h-3.5 text-slate-600" />
                      <span>Upload New Logo</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>

                    {formData.companyProfile.logo && formData.companyProfile.logo !== '/logo.png' && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            companyProfile: { ...formData.companyProfile, logo: '/logo.png' },
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset to Default</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Company / Firm Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyProfile.companyName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyProfile: { ...formData.companyProfile, companyName: e.target.value },
                      })
                    }
                    placeholder="e.g. ROYAL"
                    className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={formData.companyProfile.subtitle || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyProfile: { ...formData.companyProfile, subtitle: e.target.value },
                      })
                    }
                    placeholder="e.g. ENGINEERING & CONSTRUCTION"
                    className="w-full px-3.5 py-2.5 text-sm uppercase tracking-wider border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Primary Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyProfile.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyProfile: { ...formData.companyProfile, phone: e.target.value },
                      })
                    }
                    placeholder="e.g. +91 9544976383"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Secondary / Alternate Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.companyProfile.phone2 || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyProfile: { ...formData.companyProfile, phone2: e.target.value },
                      })
                    }
                    placeholder="e.g. +91 9447676223"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Billing Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.companyProfile.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyProfile: { ...formData.companyProfile, email: e.target.value },
                      })
                    }
                    placeholder="e.g. royalengandconstruction@gmail.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Company GSTIN *
                  </label>
                  <input
                    type="text"
                    value={formData.companyProfile.gstin || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyProfile: { ...formData.companyProfile, gstin: e.target.value.toUpperCase() },
                      })
                    }
                    placeholder="e.g. 32GCDPP0980D1ZT"
                    className="w-full px-3.5 py-2.5 text-sm font-mono uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Registered Office Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyProfile.address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyProfile: { ...formData.companyProfile, address: e.target.value },
                      })
                    }
                    placeholder="e.g. Tuvvur"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    District / City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyProfile.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyProfile: { ...formData.companyProfile, city: e.target.value },
                      })
                    }
                    placeholder="e.g. Malappuram Dt."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyProfile.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyProfile: { ...formData.companyProfile, state: e.target.value },
                      })
                    }
                    placeholder="e.g. Kerala"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyProfile.pincode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyProfile: { ...formData.companyProfile, pincode: e.target.value },
                      })
                    }
                    placeholder="e.g. 679 327"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Website (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.companyProfile.website || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyProfile: { ...formData.companyProfile, website: e.target.value },
                      })
                    }
                    placeholder="e.g. https://royalengineering.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Live PDF Header Preview */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-700" />
                  Live Preview: PDF Top Header Appearance
                </span>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4 max-w-lg">
                  <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl p-1 flex items-center justify-center shrink-0">
                    <img src={formData.companyProfile.logo || '/logo.png'} alt="logo" className="w-full h-full object-contain" />
                  </div>
                  <div className="border-l border-slate-300 pl-3">
                    <h5 className="text-base font-black text-slate-900 tracking-tight leading-none">
                      {formData.companyProfile.companyName || 'ROYAL'}
                    </h5>
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">
                      {formData.companyProfile.subtitle || 'ENGINEERING & CONSTRUCTION'}
                    </p>
                    <div className="text-[10px] text-slate-500 space-y-0.5 mt-2">
                      <p>📍 {formData.companyProfile.address}, {formData.companyProfile.city}, {formData.companyProfile.state} - {formData.companyProfile.pincode}</p>
                      <p>✉ {formData.companyProfile.email}</p>
                      <p>📞 {formData.companyProfile.phone} {formData.companyProfile.phone2 ? `| ${formData.companyProfile.phone2}` : ''}</p>
                      <p>💳 GSTIN: {formData.companyProfile.gstin}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Company Profile'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 2: INVOICE & TERMS & CONDITIONS                       */}
        {/* ========================================================= */}
        {activeTab === 'invoice' && (
          <form onSubmit={handleSaveInvoice} className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-soft space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900">Sequential Numbering & TERMS & CONDITIONS</h3>
                <p className="text-xs text-mutedText mt-0.5">
                  Controls auto-generated invoice prefixes, default terms and the bottom-left Terms & Conditions card on PDF
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Invoice Prefix *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.invoiceSettings.prefix}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoiceSettings: { ...formData.invoiceSettings, prefix: e.target.value },
                      })
                    }
                    placeholder="e.g. INV-2026"
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Next Sequence Number *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.invoiceSettings.nextNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoiceSettings: { ...formData.invoiceSettings, nextNumber: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Default Payment Terms
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceSettings.defaultPaymentTerms}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoiceSettings: { ...formData.invoiceSettings, defaultPaymentTerms: e.target.value },
                      })
                    }
                    placeholder="e.g. Payment due within 15 days of invoice date."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                {/* TERMS & CONDITIONS MULTILINE TEXTAREA */}
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-900 uppercase tracking-wider text-xs">
                      Official Terms & Conditions (PDF Bottom-Left Box) *
                    </label>
                    <span className="text-[11px] text-mutedText">Enter each condition on a separate line</span>
                  </div>

                  <textarea
                    rows={5}
                    value={formData.invoiceSettings.termsAndConditions || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoiceSettings: { ...formData.invoiceSettings, termsAndConditions: e.target.value },
                      })
                    }
                    placeholder="Enter Terms & Conditions line by line..."
                    className="w-full px-3.5 py-3 text-xs leading-relaxed border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black font-sans resize-y"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Default Invoice Internal / Thank You Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceSettings.defaultNotes || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoiceSettings: { ...formData.invoiceSettings, defaultNotes: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Live Preview: Terms & Conditions Box on PDF */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-700" />
                  Live Preview: TERMS & CONDITIONS Box on PDF Invoice
                </span>
                <div className="max-w-lg bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                    <FileText className="w-3 h-3 text-slate-600" />
                    <span>TERMS & CONDITIONS</span>
                  </div>
                  <div className="p-3.5 space-y-1.5 text-[11px] text-slate-600">
                    {(formData.invoiceSettings.termsAndConditions || '')
                      .split('\n')
                      .filter((l) => l.trim().length > 0)
                      .map((line, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="font-bold text-slate-400">•</span>
                          <span>{line.replace(/^[•\-\*]\s*/, '')}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Terms & Preferences'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SIGNATORY & SIGNATURE                              */}
        {/* ========================================================= */}
        {activeTab === 'signature' && (
          <form onSubmit={handleSaveSignature} className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-soft space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900">Authorized Signatory & Digital Signature</h3>
                <p className="text-xs text-mutedText mt-0.5">
                  Configure signatory designation and digital executive signature printed at the bottom-right of PDF invoices
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Signatory Company Header
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceSettings.signatoryCompany || 'For Royal Engineering & Construction'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoiceSettings: { ...formData.invoiceSettings, signatoryCompany: e.target.value },
                      })
                    }
                    placeholder="e.g. For Royal Engineering & Construction"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Signatory Title / Designation
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceSettings.signatoryTitle || 'Authorized Signatory'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoiceSettings: { ...formData.invoiceSettings, signatoryTitle: e.target.value },
                      })
                    }
                    placeholder="e.g. Authorized Signatory / Managing Director"
                    className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Signature Mode Choice & Drawing Pad */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Signature Style on PDF Invoices
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Upload or Draw Signature */}
                  <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5 text-slate-700" />
                        Draw or Upload Signature
                      </span>

                      {formData.invoiceSettings.signatureImage && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              invoiceSettings: { ...formData.invoiceSettings, signatureImage: '' },
                            })
                          }
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset to Default Vector</span>
                        </button>
                      )}
                    </div>

                    {/* Canvas Pad */}
                    <div className="space-y-2">
                      <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-2 relative shadow-inner">
                        <canvas
                          ref={canvasRef}
                          width={320}
                          height={110}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-28 touch-none cursor-crosshair bg-white rounded-lg"
                        />
                        <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 pointer-events-none">
                          Draw inside this box
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                          <span>Clear Pad</span>
                        </button>

                        <button
                          type="button"
                          onClick={applyDrawnSignature}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-lg shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Use Drawn Signature</span>
                        </button>
                      </div>
                    </div>

                    {/* Or Upload Image */}
                    <div className="pt-3 border-t border-slate-200">
                      <span className="text-[11px] text-slate-500 block mb-2 font-medium">
                        Or upload a scanned signature image (PNG / JPG):
                      </span>
                      <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-soft">
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        <span>Upload Signature File</span>
                        <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Right: Live PDF Signatory Box Preview */}
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-4">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-slate-700" />
                      Live Preview: Signatory Box on PDF Invoice
                    </span>

                    <div className="w-full max-w-[220px] mx-auto bg-white rounded-xl border border-slate-300 p-4 text-center shadow-sm space-y-2">
                      <p className="text-[10px] text-slate-600 font-sans">
                        {formData.invoiceSettings.signatoryCompany || 'For Royal Engineering & Construction'}
                      </p>

                      {/* Signature render */}
                      <div className="h-12 flex items-center justify-center overflow-hidden">
                        {formData.invoiceSettings.signatureImage ? (
                          <img
                            src={formData.invoiceSettings.signatureImage}
                            alt="Custom Signature"
                            className="max-h-12 max-w-full object-contain mx-auto"
                          />
                        ) : (
                          <svg viewBox="0 0 100 35" className="h-10 w-28 text-slate-900 stroke-current fill-none">
                            <path
                              d="M5 25 C10 10, 16 8, 22 22 C26 30, 20 32, 28 26 C36 14, 46 16, 52 27 C58 32, 66 18, 74 26 C79 30, 89 28, 97 29"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>

                      <div className="w-4/5 mx-auto border-t border-slate-300 pt-1">
                        <p className="text-[10px] font-bold text-slate-900">
                          {formData.invoiceSettings.signatoryTitle || 'Authorized Signatory'}
                        </p>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 text-center">
                      {formData.invoiceSettings.signatureImage
                        ? '✓ Custom signature image active.'
                        : '✓ Executive vector curve signature active (Default).'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Signatory Settings'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 4: BANK & REMITTANCE DETAILS                          */}
        {/* ========================================================= */}
        {activeTab === 'bank' && (
          <form onSubmit={handleSaveBank} className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-soft space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900">Bank Account & Remittance Details</h3>
                <p className="text-xs text-mutedText mt-0.5">
                  Rendered on the left side of PDF invoices for client wire transfers and UPI deposits
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bankDetails.bankName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, bankName: e.target.value },
                      })
                    }
                    placeholder="e.g. HDFC Bank Ltd."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bankDetails.accountHolderName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, accountHolderName: e.target.value },
                      })
                    }
                    placeholder="e.g. Royal Engineering & Construction"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bankDetails.accountNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, accountNumber: e.target.value },
                      })
                    }
                    placeholder="e.g. 50200012345678"
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bankDetails.ifscCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, ifscCode: e.target.value.toUpperCase() },
                      })
                    }
                    placeholder="e.g. HDFC0001234"
                    className="w-full px-3.5 py-2.5 text-sm font-mono uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    UPI ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.bankDetails.upiId || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, upiId: e.target.value },
                      })
                    }
                    placeholder="e.g. royalengandconstruction@hdfcbank"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Live Preview: Bank Details Box on PDF */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-700" />
                  Live Preview: BANK DETAILS Box on PDF Invoice
                </span>
                <div className="max-w-md bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                    <Landmark className="w-3 h-3 text-slate-600" />
                    <span>BANK DETAILS & PAYMENT MODE</span>
                  </div>
                  <div className="p-3.5 space-y-1.5 text-[11px] text-slate-700">
                    <p><strong className="text-slate-500 font-medium">Bank Name:</strong> {formData.bankDetails.bankName}</p>
                    <p><strong className="text-slate-500 font-medium">Account Holder:</strong> {formData.bankDetails.accountHolderName}</p>
                    <p><strong className="text-slate-500 font-medium">Account No.:</strong> <span className="font-mono">{formData.bankDetails.accountNumber}</span></p>
                    <p><strong className="text-slate-500 font-medium">IFSC Code:</strong> <span className="font-mono uppercase">{formData.bankDetails.ifscCode}</span></p>
                    {formData.bankDetails.upiId && (
                      <p><strong className="text-slate-500 font-medium">UPI ID:</strong> {formData.bankDetails.upiId}</p>
                    )}
                    <p className="text-[10px] text-slate-400 italic pt-1">
                      Please quote invoice number while transferring funds.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Bank Details'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 5: GST TAX MATRIX                                     */}
        {/* ========================================================= */}
        {activeTab === 'gst' && (
          <form onSubmit={handleSaveGST} className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-soft space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900">GST Parameters & Supplier Base State</h3>
                <p className="text-xs text-mutedText mt-0.5">
                  Determines Intra-State (CGST + SGST) vs Inter-State (IGST) taxation automatically
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Supplier Base State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.gstSettings.supplierState}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gstSettings: { ...formData.gstSettings, supplierState: e.target.value },
                      })
                    }
                    placeholder="e.g. Kerala"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Default Supply Type
                  </label>
                  <select
                    value={formData.gstSettings.defaultSupplyType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gstSettings: {
                          ...formData.gstSettings,
                          defaultSupplyType: e.target.value as any,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    <option value="Intra-State">Intra-State (CGST + SGST)</option>
                    <option value="Inter-State">Inter-State (IGST)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.gstSettings.defaultApplicability}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gstSettings: {
                            ...formData.gstSettings,
                            defaultApplicability: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-slate-300 text-black focus:ring-black w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Enable GST tax calculations by default on all newly created invoices
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-black hover:bg-slate-900 rounded-xl shadow-soft disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save GST Configuration'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </>
  );
};
