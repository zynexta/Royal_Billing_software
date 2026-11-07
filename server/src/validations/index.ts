import { z } from 'zod';

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const clientSchema = z.object({
  clientName: z.string().min(2, 'Client name must be at least 2 characters').trim(),
  contactPerson: z.string().optional(),
  phone: z.string().min(8, 'Phone number must be at least 8 digits').trim(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  billingAddress: z.string().min(5, 'Address is required').trim(),
  city: z.string().min(2, 'City is required').trim(),
  state: z.string().min(2, 'State is required').trim(),
  pincode: z.string().min(3, 'Pincode is required').trim(),
  gstin: z.string().trim().toUpperCase().refine((val) => !val || GSTIN_REGEX.test(val), {
    message: 'Invalid GSTIN format (e.g. 06AAAAA0000A1Z5)',
  }).optional().or(z.literal('')),
});

export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().default('Units'),
  rate: z.number().nonnegative('Rate must be 0 or greater'),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  projectName: z.string().min(2, 'Project name is required').trim(),
  projectLocation: z.string().optional(),
  projectDescription: z.string().optional(),
  workDetails: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  discount: z.object({
    type: z.enum(['Fixed', 'Percentage']).default('Fixed'),
    value: z.number().nonnegative().default(0),
  }).default({ type: 'Fixed', value: 0 }),
  additionalCharges: z.number().nonnegative().default(0),
  gstDetails: z.object({
    isApplicable: z.boolean().default(true),
    rate: z.number().nonnegative().default(18),
    supplyType: z.enum(['Intra-State', 'Inter-State']).default('Intra-State'),
  }),
  invoiceDate: z.string().or(z.date()).default(() => new Date()),
  dueDate: z.string().or(z.date()),
  paymentTerms: z.string().default('Payment due within 15 days.'),
  notes: z.string().optional(),
  status: z.enum(['Draft', 'Issued']).default('Draft'),
});

export const createPaymentSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  invoiceId: z.string().optional().or(z.literal('')),
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentDate: z.string().or(z.date()).default(() => new Date()),
  paymentMethod: z.enum(['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other']),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

export const updateSettingsSchema = z.object({
  companyProfile: z.object({
    companyName: z.string().min(2),
    logo: z.string().optional(),
    address: z.string().min(2),
    city: z.string().min(2),
    state: z.string().min(2),
    pincode: z.string().min(3),
    phone: z.string().min(5),
    email: z.string().email(),
    website: z.string().optional(),
    gstin: z.string().optional(),
  }).partial().optional(),
  invoiceSettings: z.object({
    prefix: z.string().min(1),
    nextNumber: z.number().int().positive(),
    defaultPaymentTerms: z.string(),
    defaultNotes: z.string().optional(),
    currency: z.string().default('INR'),
    dateFormat: z.string().default('DD/MM/YYYY'),
  }).partial().optional(),
  gstSettings: z.object({
    defaultApplicability: z.boolean(),
    rates: z.array(z.number()),
    supplierState: z.string(),
    defaultSupplyType: z.enum(['Intra-State', 'Inter-State']),
    enableReverseCharge: z.boolean(),
  }).partial().optional(),
  bankDetails: z.object({
    bankName: z.string(),
    accountHolderName: z.string(),
    accountNumber: z.string(),
    ifscCode: z.string(),
    upiId: z.string().optional(),
  }).partial().optional(),
});

