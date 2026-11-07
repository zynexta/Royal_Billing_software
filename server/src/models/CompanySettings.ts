import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyProfile {
  companyName: string;
  subtitle?: string;
  logo?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  phone2?: string;
  email: string;
  website?: string;
  gstin?: string;
}

export interface IInvoiceSettings {
  prefix: string;
  nextNumber: number;
  defaultPaymentTerms: string;
  defaultNotes?: string;
  termsAndConditions?: string;
  signatoryCompany?: string;
  signatoryTitle?: string;
  signatureImage?: string;
  currency: string;
  dateFormat: string;
}

export interface IGSTSettings {
  defaultApplicability: boolean;
  rates: number[];
  supplierState: string;
  defaultSupplyType: 'Intra-State' | 'Inter-State';
  enableReverseCharge: boolean;
}

export interface IBankDetails {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
}

export interface ICompanySettings extends Document {
  companyProfile: ICompanyProfile;
  invoiceSettings: IInvoiceSettings;
  gstSettings: IGSTSettings;
  bankDetails: IBankDetails;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySettingsSchema = new Schema<ICompanySettings>(
  {
    companyProfile: {
      companyName: { type: String, default: 'Royal Engineering & Construction' },
      subtitle: { type: String, default: 'ENGINEERING & CONSTRUCTION' },
      logo: { type: String, default: '/logo.png' },
      address: { type: String, default: 'Tuvvur' },
      city: { type: String, default: 'Malappuram Dt.' },
      state: { type: String, default: 'Kerala' },
      pincode: { type: String, default: '679 327' },
      phone: { type: String, default: '+91 9544976383 | +91 9447676223' },
      phone2: { type: String, default: '' },
      email: { type: String, default: 'royalengandconstruction@gmail.com' },
      website: { type: String, default: 'https://royalengineering.com' },
      gstin: { type: String, default: '32GCDPP0980D1ZT' },
    },
    invoiceSettings: {
      prefix: { type: String, default: 'INV-2026' },
      nextNumber: { type: Number, default: 1 },
      defaultPaymentTerms: { type: String, default: 'Payment due within 15 days of invoice date.' },
      defaultNotes: { type: String, default: 'Thank you for partnering with Royal Engineering & Construction. Quality and safety guaranteed.' },
      termsAndConditions: {
        type: String,
        default: '• Thank you for partnering with Royal Engineering & Construction.\n• Payment to be made as per agreed terms.\n• Any discrepancies should be reported within 7 days of invoice date.\n• This is a computer-generated tax invoice and does not require a physical signature.',
      },
      signatoryCompany: { type: String, default: 'For Royal Engineering & Construction' },
      signatoryTitle: { type: String, default: 'Authorized Signatory' },
      signatureImage: { type: String, default: '' },
      currency: { type: String, default: 'INR' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
    },
    gstSettings: {
      defaultApplicability: { type: Boolean, default: true },
      rates: { type: [Number], default: [5, 12, 18, 28] },
      supplierState: { type: String, default: 'Kerala' },
      defaultSupplyType: { type: String, enum: ['Intra-State', 'Inter-State'], default: 'Intra-State' },
      enableReverseCharge: { type: Boolean, default: false },
    },
    bankDetails: {
      bankName: { type: String, default: 'HDFC Bank Ltd.' },
      accountHolderName: { type: String, default: 'Royal Engineering & Construction' },
      accountNumber: { type: String, default: '50200012345678' },
      ifscCode: { type: String, default: 'HDFC0001234' },
      upiId: { type: String, default: 'royalengandconstruction@hdfcbank' },
    },
  },
  { timestamps: true }
);

export const CompanySettings = mongoose.model<ICompanySettings>('CompanySettings', CompanySettingsSchema);

