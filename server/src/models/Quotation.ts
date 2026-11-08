import mongoose, { Document, Schema } from 'mongoose';
import {
  ApprovalDetails,
  ClientSnapshot,
  CompanySnapshot,
  GSTBreakdown,
  InvoiceItem,
  QuotationStatus,
} from '../types/index.js';

export interface IQuotation extends Document {
  quotationNumber: string;
  clientId: mongoose.Types.ObjectId;
  clientSnapshot: ClientSnapshot;
  companySnapshot?: CompanySnapshot;
  projectName: string;
  projectLocation?: string;
  projectDescription?: string;
  workCategory?: string;
  workDetails?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: {
    type: 'Fixed' | 'Percentage';
    value: number;
    amount: number;
  };
  additionalCharges: number;
  taxableAmount: number;
  estimatedGstDetails: GSTBreakdown;
  estimatedGrandTotal: number;
  quotationDate: Date;
  validUntil: Date;
  paymentTerms: string;
  paymentSchedule?: string;
  termsAndConditions?: string;
  remarks?: string;
  declaration?: string;
  materialInclusions?: string;
  labourInclusions?: string;
  exclusions?: string;
  notes?: string;
  status: QuotationStatus;
  approvalDetails?: ApprovalDetails;
  sentAt?: Date;
  convertedInvoiceId?: mongoose.Types.ObjectId;
  convertedInvoiceNumber?: string;
  convertedAt?: Date;
  revisionNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuotationItemSchema = new Schema<InvoiceItem>(
  {
    area: { type: String, trim: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, default: 'Units' },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const EstimatedGSTDetailsSchema = new Schema<GSTBreakdown>(
  {
    isApplicable: { type: Boolean, default: true },
    rate: { type: Number, default: 18 },
    supplyType: { type: String, enum: ['Intra-State', 'Inter-State'], default: 'Intra-State' },
    cgstRate: { type: Number, default: 9 },
    cgstAmount: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 9 },
    sgstAmount: { type: Number, default: 0 },
    igstRate: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
  },
  { _id: false }
);

const ApprovalDetailsSchema = new Schema<ApprovalDetails>(
  {
    approvedBy: { type: String, required: true },
    approvalDate: { type: Date, required: true, default: Date.now },
    approvalMethod: {
      type: String,
      enum: [
        'WhatsApp',
        'Email',
        'Phone',
        'Verbal',
        'In Person',
        'Written',
        'Written Confirmation',
        'Other',
      ],
      default: 'WhatsApp',
    },
    approvalNotes: { type: String },
  },
  { _id: false }
);

const QuotationSchema = new Schema<IQuotation>(
  {
    quotationNumber: { type: String, required: true, unique: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    clientSnapshot: {
      clientName: { type: String, required: true },
      contactPerson: { type: String },
      phone: { type: String, required: true },
      email: { type: String },
      billingAddress: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      gstin: { type: String },
    },
    companySnapshot: { type: Schema.Types.Mixed },
    projectName: { type: String, required: true, trim: true },
    projectLocation: { type: String, trim: true },
    projectDescription: { type: String, trim: true },
    workCategory: { type: String, trim: true },
    workDetails: { type: String, trim: true },
    items: { type: [QuotationItemSchema], required: true, default: [] },
    subtotal: { type: Number, required: true, default: 0 },
    discount: {
      type: { type: String, enum: ['Fixed', 'Percentage'], default: 'Fixed' },
      value: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
    },
    additionalCharges: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true, default: 0 },
    estimatedGstDetails: { type: EstimatedGSTDetailsSchema, required: true },
    estimatedGrandTotal: { type: Number, required: true, default: 0 },
    quotationDate: { type: Date, required: true, default: Date.now },
    validUntil: { type: Date, required: true },
    paymentTerms: {
      type: String,
      default: 'Mobilization Advance: 30% | Running Work: 60% | Final Handover: 10%',
    },
    paymentSchedule: { type: String, trim: true },
    termsAndConditions: { type: String },
    remarks: { type: String, trim: true },
    declaration: { type: String, trim: true },
    materialInclusions: { type: String, trim: true },
    labourInclusions: { type: String, trim: true },
    exclusions: { type: String, trim: true },
    notes: { type: String },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Converted'],
      default: 'Draft',
      index: true,
    },
    approvalDetails: { type: ApprovalDetailsSchema },
    sentAt: { type: Date },
    convertedInvoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', index: true },
    convertedInvoiceNumber: { type: String },
    convertedAt: { type: Date },
    revisionNumber: { type: Number, default: 1 },
  },
  { timestamps: true }
);

QuotationSchema.index({ quotationDate: -1, status: 1 });
QuotationSchema.index({ projectName: 'text', quotationNumber: 'text' });

export const Quotation = mongoose.model<IQuotation>('Quotation', QuotationSchema);

