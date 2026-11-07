import mongoose, { Document, Schema } from 'mongoose';
import { ClientSnapshot, CompanySnapshot, GSTBreakdown, InvoiceItem, InvoiceStatus } from '../types/index.js';

export interface IInvoice extends Document {
  invoiceNumber: string;
  invoiceType: string;
  clientId: mongoose.Types.ObjectId;
  clientSnapshot: ClientSnapshot;
  companySnapshot?: CompanySnapshot;
  projectName: string;
  projectLocation?: string;
  projectDescription?: string;
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
  gstDetails: GSTBreakdown;
  grandTotal: number;
  amountReceivedSnapshot: number;
  balanceDueSnapshot: number;
  invoiceDate: Date;
  dueDate: Date;
  paymentTerms: string;
  status: InvoiceStatus;
  notes?: string;
  issuedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<InvoiceItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, default: 'Units' },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const GSTDetailsSchema = new Schema<GSTBreakdown>(
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

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    invoiceType: { type: String, default: 'Tax Invoice' },
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
    workDetails: { type: String, trim: true },
    items: { type: [InvoiceItemSchema], required: true, default: [] },
    subtotal: { type: Number, required: true, default: 0 },
    discount: {
      type: { type: String, enum: ['Fixed', 'Percentage'], default: 'Fixed' },
      value: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
    },
    additionalCharges: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true, default: 0 },
    gstDetails: { type: GSTDetailsSchema, required: true },
    grandTotal: { type: Number, required: true, default: 0 },
    amountReceivedSnapshot: { type: Number, default: 0 },
    balanceDueSnapshot: { type: Number, default: 0 },
    invoiceDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    paymentTerms: { type: String, default: 'Payment due within 15 days.' },
    status: {
      type: String,
      enum: ['Draft', 'Issued', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
      default: 'Draft',
      index: true,
    },
    notes: { type: String },
    issuedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

InvoiceSchema.index({ invoiceDate: -1, status: 1 });
InvoiceSchema.index({ projectName: 'text', invoiceNumber: 'text' });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);

