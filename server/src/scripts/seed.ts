import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { CompanySettings } from '../models/CompanySettings.js';
import { Client } from '../models/Client.js';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { ENV } from '../config/env.js';
import { calculateGST, calculateGrandTotal, calculateItemAmount, calculateSubtotal, calculateTaxableAmount } from '../services/calculationService.js';

export async function seedInitialData() {
  try {
    // 1. Seed Admin User
    const existingAdmin = await User.findOne({ email: ENV.ADMIN_EMAIL.toLowerCase() });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(ENV.ADMIN_PASSWORD, salt);

      await User.create({
        name: 'Apex Construction Director',
        email: ENV.ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        role: 'admin',
        isActive: true,
      });
      console.log(`[Seed] Initial Admin user created: ${ENV.ADMIN_EMAIL}`);
    }

    // 2. Seed Default Company Settings
    const existingSettings = await CompanySettings.findOne();
    if (!existingSettings) {
      await CompanySettings.create({
        companyProfile: {
          companyName: 'Apex Skyline Infrastructure & Constructions',
          logo: '',
          address: 'Plot 42, Commercial Sector 18',
          city: 'Gurugram',
          state: 'Haryana',
          pincode: '122002',
          phone: '+91 88910 03031',
          email: 'billing@apexconstructions.com',
          website: 'https://apexconstructions.example.com',
          gstin: '06AAAAA0000A1Z5',
        },
        invoiceSettings: {
          prefix: 'INV-2026',
          nextNumber: 4,
          defaultPaymentTerms: 'Payment due within 15 days of invoice date.',
          defaultNotes: 'Thank you for partnering with Apex Skyline Infrastructure. Quality and safety guaranteed.',
          currency: 'INR',
          dateFormat: 'DD/MM/YYYY',
        },
        gstSettings: {
          defaultApplicability: true,
          rates: [5, 12, 18, 28],
          supplierState: 'Haryana',
          defaultSupplyType: 'Intra-State',
          enableReverseCharge: false,
        },
        bankDetails: {
          bankName: 'HDFC Bank Ltd.',
          accountHolderName: 'Apex Skyline Infrastructure Pvt Ltd',
          accountNumber: '50200012345678',
          ifscCode: 'HDFC0001234',
          upiId: 'apexconstructions@hdfcbank',
        },
      });
      console.log('[Seed] Default company settings initialized.');
    }

    // 3. Seed Realistic Demo Data if DB has zero clients
    const clientCount = await Client.countDocuments();
    if (clientCount === 0) {
      console.log('[Seed] Populating initial realistic construction clients and sample invoices...');

      const client1 = await Client.create({
        clientName: 'DLF Cyber Real Estate Pvt Ltd',
        contactPerson: 'Mr. Rajesh Verma',
        phone: '+91 98112 34567',
        email: 'rajesh.verma@dlfgroup.example.com',
        billingAddress: 'Cyber City, Tower B, 10th Floor',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122002',
        gstin: '06AAACD1234F1Z8',
      });

      const client2 = await Client.create({
        clientName: 'Godrej Highland Towers JV',
        contactPerson: 'Ms. Sunita Sharma',
        phone: '+91 98711 98765',
        email: 'accounts@godrejhighlands.example.com',
        billingAddress: 'Highland Park Road, Sector 150',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201310',
        gstin: '09AABCG5432M1ZP',
      });

      const client3 = await Client.create({
        clientName: 'Signature Global Horizon Infra',
        contactPerson: 'Vikram Malhotra',
        phone: '+91 99991 22334',
        email: 'procurement@signatureglobal.example.com',
        billingAddress: 'Dwarka Expressway, Sector 37D',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122001',
        gstin: '06AAACS8888P1Z3',
      });

      // Sample Invoice 1 - Intra-State (Haryana to Haryana, 18% CGST/SGST), Partially Paid
      const items1 = [
        { description: 'Foundation RCC Casting & Structural Pile Work', quantity: 1, unit: 'Job', rate: 450000, amount: 450000 },
        { description: 'Steel Reinforcement Bar Supply & Fixing (Fe 550D)', quantity: 15, unit: 'Tons', rate: 65000, amount: 975000 },
        { description: 'Heavy Excavation and Soil Consolidation', quantity: 2, unit: 'Acres', rate: 75000, amount: 150000 },
      ];
      const subtotal1 = calculateSubtotal(items1);
      const taxable1 = calculateTaxableAmount(subtotal1, 0, 0);
      const gst1 = calculateGST(taxable1, true, 18, 'Intra-State');
      const grandTotal1 = calculateGrandTotal(taxable1, gst1.totalTax);

      const inv1 = await Invoice.create({
        invoiceNumber: 'INV-2026-001',
        invoiceType: 'Tax Invoice',
        clientId: client1._id,
        clientSnapshot: {
          clientName: client1.clientName,
          contactPerson: client1.contactPerson,
          phone: client1.phone,
          email: client1.email,
          billingAddress: client1.billingAddress,
          city: client1.city,
          state: client1.state,
          pincode: client1.pincode,
          gstin: client1.gstin,
        },
        projectName: 'DLF Cyber Horizon Phase II Structural Core',
        projectLocation: 'DLF Cyber City, Sector 24, Gurugram',
        projectDescription: 'Phase 2 Foundation, structural civil casting and reinforced columns.',
        items: items1,
        subtotal: subtotal1,
        discount: { type: 'Fixed', value: 0, amount: 0 },
        additionalCharges: 0,
        taxableAmount: taxable1,
        gstDetails: gst1,
        grandTotal: grandTotal1,
        amountReceivedSnapshot: 1000000,
        balanceDueSnapshot: grandTotal1 - 1000000,
        invoiceDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        paymentTerms: 'Payment due within 30 days of RA bill.',
        status: 'Partially Paid',
        issuedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      });

      // Sample Payment against Invoice 1
      await Payment.create({
        clientId: client1._id,
        invoiceId: inv1._id,
        amount: 1000000,
        paymentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        paymentMethod: 'Bank Transfer',
        transactionReference: 'NEFT-HDFC-99882211',
        notes: 'Initial milestone advance payment after site pile test verification.',
        status: 'Completed',
      });

      // Sample Invoice 2 - Inter-State (Haryana to UP, 18% IGST), Paid
      const items2 = [
        { description: 'Pre-engineered Warehouse PEB Steel Structure Fabrication', quantity: 1, unit: 'Lot', rate: 750000, amount: 750000 },
        { description: 'Industrial Floor Trimix Concrete Flooring (M25 Grade)', quantity: 12000, unit: 'Sq.Ft', rate: 45, amount: 540000 },
      ];
      const subtotal2 = calculateSubtotal(items2);
      const taxable2 = calculateTaxableAmount(subtotal2, 0, 0);
      const gst2 = calculateGST(taxable2, true, 18, 'Inter-State');
      const grandTotal2 = calculateGrandTotal(taxable2, gst2.totalTax);

      const inv2 = await Invoice.create({
        invoiceNumber: 'INV-2026-002',
        invoiceType: 'Tax Invoice',
        clientId: client2._id,
        clientSnapshot: {
          clientName: client2.clientName,
          contactPerson: client2.contactPerson,
          phone: client2.phone,
          email: client2.email,
          billingAddress: client2.billingAddress,
          city: client2.city,
          state: client2.state,
          pincode: client2.pincode,
          gstin: client2.gstin,
        },
        projectName: 'Godrej Highland Commercial Storage Hub',
        projectLocation: 'Sector 150 Expressway Node, Noida',
        projectDescription: 'Fabrication and erection of heavy PEB shed with industrial vacuum dewatered flooring.',
        items: items2,
        subtotal: subtotal2,
        discount: { type: 'Fixed', value: 0, amount: 0 },
        additionalCharges: 0,
        taxableAmount: taxable2,
        gstDetails: gst2,
        grandTotal: grandTotal2,
        amountReceivedSnapshot: grandTotal2,
        balanceDueSnapshot: 0,
        invoiceDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        paymentTerms: '100% against final inspection.',
        status: 'Paid',
        issuedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      });

      await Payment.create({
        clientId: client2._id,
        invoiceId: inv2._id,
        amount: grandTotal2,
        paymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        paymentMethod: 'Bank Transfer',
        transactionReference: 'RTGS-ICICI-00998877',
        notes: 'Full clearance payment upon joint quality sign-off.',
        status: 'Completed',
      });

      // Sample Invoice 3 - Draft
      const items3 = [
        { description: 'Boundary Retaining Wall Construction (Brickwork & Plaster)', quantity: 240, unit: 'R.Mtr', rate: 1850, amount: 444000 },
        { description: 'Site Security Cabin & Main Entry Gate Fabrication', quantity: 1, unit: 'Set', rate: 125000, amount: 125000 },
      ];
      const subtotal3 = calculateSubtotal(items3);
      const taxable3 = calculateTaxableAmount(subtotal3, 0, 0);
      const gst3 = calculateGST(taxable3, true, 18, 'Intra-State');
      const grandTotal3 = calculateGrandTotal(taxable3, gst3.totalTax);

      await Invoice.create({
        invoiceNumber: 'INV-2026-003',
        invoiceType: 'Tax Invoice',
        clientId: client3._id,
        clientSnapshot: {
          clientName: client3.clientName,
          contactPerson: client3.contactPerson,
          phone: client3.phone,
          email: client3.email,
          billingAddress: client3.billingAddress,
          city: client3.city,
          state: client3.state,
          pincode: client3.pincode,
          gstin: client3.gstin,
        },
        projectName: 'Signature Global Horizon Boundary Wall & Enclosure',
        projectLocation: 'Sector 37D, Dwarka Expressway',
        projectDescription: 'Peripheral security perimeter construction.',
        items: items3,
        subtotal: subtotal3,
        discount: { type: 'Fixed', value: 0, amount: 0 },
        additionalCharges: 0,
        taxableAmount: taxable3,
        gstDetails: gst3,
        grandTotal: grandTotal3,
        amountReceivedSnapshot: 0,
        balanceDueSnapshot: grandTotal3,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        paymentTerms: 'Payment due within 15 days.',
        status: 'Draft',
      });

      console.log('[Seed] Realistic construction demo records seeded successfully.');
    }
  } catch (err) {
    console.error('[Seed] Error seeding initial data:', err);
  }
}

