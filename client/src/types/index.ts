export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export interface Client {
  _id: string;
  clientName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  billingAddress: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  isArchived: boolean;
  invoiceCount?: number;
  totalBilled?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'Draft' | 'Issued' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
export type SupplyType = 'Intra-State' | 'Inter-State';

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface GSTBreakdown {
  isApplicable: boolean;
  rate: number;
  supplyType: SupplyType;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
}

export interface ClientSnapshot {
  clientName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  billingAddress: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceType: string;
  clientId: string | Client;
  clientSnapshot: ClientSnapshot;
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
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  status: InvoiceStatus;
  notes?: string;
  issuedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  invoiceId?: {
    _id: string;
    invoiceNumber: string;
    projectName: string;
    grandTotal: number;
    status: InvoiceStatus;
  } | string;
  clientId: {
    _id: string;
    clientName: string;
    phone: string;
  } | string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  status: 'Completed' | 'Reversed';
  reversedAt?: string;
  reversalReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  _id: string;
  companyProfile: {
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
  };
  invoiceSettings: {
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
  };
  gstSettings: {
    defaultApplicability: boolean;
    rates: number[];
    supplierState: string;
    defaultSupplyType: SupplyType;
    enableReverseCharge: boolean;
  };
  bankDetails: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    upiId?: string;
  };
}

export interface DashboardSummary {
  totalInvoices: number;
  totalProjectValue: number;
  totalAmountReceived: number;
  totalCashCollected?: number;
  totalAdvances?: number;
  outstandingAmount: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
  draftInvoicesCount: number;
  clientCount: number;
}

export interface DashboardAnalytics {
  monthlyTrends: {
    month: string;
    billed: number;
    collected: number;
  }[];
  paymentMethods: {
    name: string;
    value: number;
  }[];
}

