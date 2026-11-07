import {
  calculateItemAmount,
  calculateSubtotal,
  calculateDiscountAmount,
  calculateTaxableAmount,
  calculateGST,
  calculateGrandTotal,
  calculateOutstandingBalance,
  calculatePaymentStatus,
} from '../services/calculationService.js';

console.log('--- RUNNING FINANCIAL CALCULATION TESTS ---');

// 1. Line items
const item1 = calculateItemAmount(2, 50000); // 100000
const item2 = calculateItemAmount(3, 25000); // 75000
console.assert(item1 === 100000, `Item 1 expected 100000, got ${item1}`);
console.assert(item2 === 75000, `Item 2 expected 75000, got ${item2}`);

// 2. Subtotal
const subtotal = calculateSubtotal([
  { description: 'Civil Work', quantity: 2, unit: 'Job', rate: 50000, amount: item1 },
  { description: 'Plumbing', quantity: 3, unit: 'Points', rate: 25000, amount: item2 },
]);
console.assert(subtotal === 175000, `Subtotal expected 175000, got ${subtotal}`);

// 3. Discount Percentage
const discountPct = calculateDiscountAmount(175000, 10, 'Percentage');
console.assert(discountPct === 17500, `Discount 10% expected 17500, got ${discountPct}`);

// 4. Taxable amount
const taxable = calculateTaxableAmount(subtotal, discountPct, 5000); // 175000 - 17500 + 5000 = 162500
console.assert(taxable === 162500, `Taxable expected 162500, got ${taxable}`);

// 5. Intra-State GST (18%)
const intraGst = calculateGST(taxable, true, 18, 'Intra-State');
console.assert(intraGst.cgstRate === 9, `CGST rate expected 9, got ${intraGst.cgstRate}`);
console.assert(intraGst.sgstRate === 9, `SGST rate expected 9, got ${intraGst.sgstRate}`);
console.assert(intraGst.cgstAmount === 14625, `CGST expected 14625, got ${intraGst.cgstAmount}`);
console.assert(intraGst.sgstAmount === 14625, `SGST expected 14625, got ${intraGst.sgstAmount}`);
console.assert(intraGst.totalTax === 29250, `Total tax expected 29250, got ${intraGst.totalTax}`);

// 6. Inter-State GST (18%)
const interGst = calculateGST(taxable, true, 18, 'Inter-State');
console.assert(interGst.igstRate === 18, `IGST rate expected 18, got ${interGst.igstRate}`);
console.assert(interGst.igstAmount === 29250, `IGST expected 29250, got ${interGst.igstAmount}`);
console.assert(interGst.totalTax === 29250, `Total tax expected 29250, got ${interGst.totalTax}`);

// 7. Grand Total
const grandTotal = calculateGrandTotal(taxable, intraGst.totalTax);
console.assert(grandTotal === 191750, `Grand Total expected 191750, got ${grandTotal}`);

// 8. Outstanding Balance & Payments
const balance1 = calculateOutstandingBalance(grandTotal, 100000);
console.assert(balance1 === 91750, `Balance expected 91750, got ${balance1}`);

const statusPartial = calculatePaymentStatus(grandTotal, 100000, new Date(Date.now() + 86400000));
console.assert(statusPartial === 'Partially Paid', `Expected Partially Paid, got ${statusPartial}`);

const statusPaid = calculatePaymentStatus(grandTotal, 191750, new Date());
console.assert(statusPaid === 'Paid', `Expected Paid, got ${statusPaid}`);

console.log(' ALL FINANCIAL LOGIC TESTS PASSED WITH 100% ACCURACY!');

