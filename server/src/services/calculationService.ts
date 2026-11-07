import { GSTBreakdown, InvoiceItem, InvoiceStatus, SupplyType } from '../types/index.js';

/**
 * Rounds a number to two decimal places safely
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateItemAmount(quantity: number, rate: number): number {
  const safeQty = Math.max(0, Number(quantity) || 0);
  const safeRate = Math.max(0, Number(rate) || 0);
  return round2(safeQty * safeRate);
}

export function calculateSubtotal(items: InvoiceItem[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const sum = items.reduce((acc, item) => {
    const itemAmount = calculateItemAmount(item.quantity, item.rate);
    return acc + itemAmount;
  }, 0);
  return round2(sum);
}

export function calculateDiscountAmount(
  subtotal: number,
  discountValue: number = 0,
  discountType: 'Fixed' | 'Percentage' = 'Fixed'
): number {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  const safeVal = Math.max(0, Number(discountValue) || 0);

  if (discountType === 'Percentage') {
    const cappedPercent = Math.min(100, safeVal);
    return round2((safeSubtotal * cappedPercent) / 100);
  }
  return round2(Math.min(safeSubtotal, safeVal));
}

export function calculateTaxableAmount(
  subtotal: number,
  discountAmount: number = 0,
  additionalCharges: number = 0
): number {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  const safeDiscount = Math.max(0, Number(discountAmount) || 0);
  const safeAdditional = Math.max(0, Number(additionalCharges) || 0);

  const base = Math.max(0, safeSubtotal - safeDiscount);
  return round2(base + safeAdditional);
}

export function calculateGST(
  taxableAmount: number,
  isApplicable: boolean = true,
  rate: number = 18,
  supplyType: SupplyType = 'Intra-State'
): GSTBreakdown {
  const safeTaxable = Math.max(0, Number(taxableAmount) || 0);
  const safeRate = Math.max(0, Number(rate) || 0);

  if (!isApplicable || safeRate === 0 || safeTaxable === 0) {
    return {
      isApplicable: false,
      rate: safeRate,
      supplyType,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      totalTax: 0,
    };
  }

  if (supplyType === 'Inter-State') {
    const igstAmount = round2((safeTaxable * safeRate) / 100);
    return {
      isApplicable: true,
      rate: safeRate,
      supplyType: 'Inter-State',
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: safeRate,
      igstAmount,
      totalTax: igstAmount,
    };
  }

  // Intra-State: Split into CGST and SGST equally
  const halfRate = round2(safeRate / 2);
  const cgstAmount = round2((safeTaxable * halfRate) / 100);
  const sgstAmount = round2((safeTaxable * halfRate) / 100);
  const totalTax = round2(cgstAmount + sgstAmount);

  return {
    isApplicable: true,
    rate: safeRate,
    supplyType: 'Intra-State',
    cgstRate: halfRate,
    cgstAmount,
    sgstRate: halfRate,
    sgstAmount,
    igstRate: 0,
    igstAmount: 0,
    totalTax,
  };
}

export function calculateGrandTotal(taxableAmount: number, totalTax: number): number {
  return round2(Math.max(0, Number(taxableAmount) || 0) + Math.max(0, Number(totalTax) || 0));
}

export function calculateOutstandingBalance(grandTotal: number, amountReceived: number): number {
  const safeGrandTotal = Math.max(0, Number(grandTotal) || 0);
  const safeReceived = Math.max(0, Number(amountReceived) || 0);
  return round2(Math.max(0, safeGrandTotal - safeReceived));
}

export function calculatePaymentStatus(
  grandTotal: number,
  amountReceived: number,
  dueDate: Date | string,
  isDraft: boolean = false,
  isCancelled: boolean = false
): InvoiceStatus {
  if (isCancelled) return 'Cancelled';
  if (isDraft) return 'Draft';

  const safeGrandTotal = round2(Math.max(0, Number(grandTotal) || 0));
  const safeReceived = round2(Math.max(0, Number(amountReceived) || 0));

  if (safeReceived >= safeGrandTotal && safeGrandTotal > 0) {
    return 'Paid';
  }

  const now = new Date();
  const due = new Date(dueDate);

  // If due date has passed with balance remaining
  const isPastDue = !isNaN(due.getTime()) && now.setHours(0, 0, 0, 0) > due.setHours(0, 0, 0, 0);

  if (safeReceived > 0) {
    return isPastDue ? 'Overdue' : 'Partially Paid';
  }

  return isPastDue ? 'Overdue' : 'Issued';
}

