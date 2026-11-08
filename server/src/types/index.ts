export type UserRole = 'admin' | 'staff';

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';

export type InvoiceStatus = 'Draft' | 'Issued' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';

export type QuotationStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired' | 'Converted';

export type ApprovalMethod =
  | 'WhatsApp'
  | 'Email'
  | 'Phone'
  | 'Verbal'
  | 'In Person'
  | 'Written'
  | 'Written Confirmation'
  | 'Other';

export interface ApprovalDetails {
  approvedBy: string;
  approvalDate: Date;
  approvalMethod: ApprovalMethod;
  approvalNotes?: string;
}

export type DiscountType = 'Fixed' | 'Percentage';

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
  rate: number; // e.g. 18 for 18%
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

export interface CompanySnapshot {
  companyName: string;
  logo?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  gstin?: string;
  bankDetails?: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    upiId?: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

