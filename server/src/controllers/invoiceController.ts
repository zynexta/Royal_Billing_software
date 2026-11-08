import { Request, Response } from 'express';
import { Invoice, IInvoice } from '../models/Invoice.js';
import { Quotation } from '../models/Quotation.js';
import { Client } from '../models/Client.js';
import { Payment } from '../models/Payment.js';
import { CompanySettings } from '../models/CompanySettings.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { generateNextInvoiceNumber } from '../services/invoiceNumberService.js';
import { InvoiceStatus } from '../types/index.js';
import {
  calculateDiscountAmount,
  calculateGrandTotal,
  calculateGST,
  calculateItemAmount,
  calculateOutstandingBalance,
  calculatePaymentStatus,
  calculateSubtotal,
  calculateTaxableAmount,
  round2,
} from '../services/calculationService.js';
import { generateInvoicePDF, formatINR } from '../services/pdfService.js';
import { logAudit } from '../services/auditService.js';

export async function getInvoices(req: Request, res: Response) {
  try {
    const { search, status, clientId, startDate, endDate } = req.query;

    const filter: any = {};

    // Notice: status is filtered post-refresh so real-time dynamic payments & overdue dates are accurately reflected
    if (clientId && typeof clientId === 'string') {
      filter.clientId = clientId;
    }

    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate as string);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate as string);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { invoiceNumber: searchRegex },
        { projectName: searchRegex },
        { 'clientSnapshot.clientName': searchRegex },
      ];
    }

    const invoices = await Invoice.find(filter).sort({ invoiceDate: -1, createdAt: -1 });

    // Refresh dynamic payment status & balances and latest client particulars
    const invoiceIds = invoices.map((inv) => inv._id);
    const clientIds = invoices.map((inv) => inv.clientId);

    const [payments, clients] = await Promise.all([
      Payment.find({
        invoiceId: { $in: invoiceIds },
        status: 'Completed',
      }),
      Client.find({ _id: { $in: clientIds } }),
    ]);

    const clientMap = new Map(clients.map((c) => [c._id.toString(), c]));

    const paymentMap: Record<string, number> = {};
    payments.forEach((p) => {
      const iid = p.invoiceId!.toString();
      paymentMap[iid] = (paymentMap[iid] || 0) + p.amount;
    });

    const refreshedInvoices = invoices.map((inv) => {
      const received = round2(paymentMap[inv._id.toString()] || 0);
      let balance = calculateOutstandingBalance(inv.grandTotal, received);

      // Resolve latest client particulars so phone/address changes reflect immediately
      const currentClient = clientMap.get(inv.clientId?.toString());
      const resolvedClientSnapshot = currentClient
        ? {
            clientName: currentClient.clientName || inv.clientSnapshot?.clientName,
            contactPerson: currentClient.contactPerson || inv.clientSnapshot?.contactPerson,
            phone: currentClient.phone || inv.clientSnapshot?.phone,
            email: currentClient.email || inv.clientSnapshot?.email,
            billingAddress: currentClient.billingAddress || inv.clientSnapshot?.billingAddress,
            city: currentClient.city || inv.clientSnapshot?.city,
            state: currentClient.state || inv.clientSnapshot?.state,
            pincode: currentClient.pincode || inv.clientSnapshot?.pincode,
            gstin: currentClient.gstin || inv.clientSnapshot?.gstin,
          }
        : inv.clientSnapshot;

      // Status Hierarchy & Determination:
      let currentStatus: InvoiceStatus = inv.status;

      // 1. If explicitly Paid or payments cover full amount
      if (inv.status === 'Paid' || (received >= inv.grandTotal && inv.grandTotal > 0 && inv.status !== 'Draft' && inv.status !== 'Cancelled')) {
        currentStatus = 'Paid';
        balance = 0;
      }
      // 2. If explicitly Cancelled or Draft, always preserve
      else if (inv.status === 'Cancelled') {
        currentStatus = 'Cancelled';
      }
      else if (inv.status === 'Draft') {
        currentStatus = 'Draft';
      }
      // 3. If explicitly Overdue, always preserve
      else if (inv.status === 'Overdue') {
        currentStatus = 'Overdue';
      }
      // 4. If due date has passed with remaining balance, it is automatically Overdue
      else if (inv.dueDate && new Date() > new Date(inv.dueDate) && balance > 0) {
        currentStatus = 'Overdue';
      }
      // 5. If payments received > 0, it is Partially Paid
      else if (received > 0 && received < inv.grandTotal) {
        currentStatus = 'Partially Paid';
      }
      // 6. If explicitly set to Partially Paid
      else if (inv.status === 'Partially Paid') {
        currentStatus = 'Partially Paid';
      }
      // 7. Otherwise Issued
      else {
        currentStatus = 'Issued';
      }

      return {
        ...inv.toObject(),
        clientSnapshot: resolvedClientSnapshot,
        amountReceivedSnapshot: currentStatus === 'Paid' ? Math.max(received, inv.grandTotal) : received,
        balanceDueSnapshot: balance,
        status: currentStatus,
      };
    });

    // Synchronize computed status & balances back into MongoDB documents asynchronously
    for (const inv of invoices) {
      const refreshed = refreshedInvoices.find((r) => r._id.toString() === inv._id.toString());
      if (refreshed && (refreshed.status !== inv.status || refreshed.amountReceivedSnapshot !== inv.amountReceivedSnapshot)) {
        Invoice.updateOne(
          { _id: inv._id },
          {
            $set: {
              status: refreshed.status,
              amountReceivedSnapshot: refreshed.amountReceivedSnapshot,
              balanceDueSnapshot: refreshed.balanceDueSnapshot,
            },
          }
        ).exec().catch(() => {});
      }
    }

    // Apply status filter on the dynamic accurately refreshed invoices
    let finalResult = refreshedInvoices;
    if (status && typeof status === 'string' && status !== 'All') {
      finalResult = refreshedInvoices.filter((inv) => inv.status === status);
    }

    return sendSuccess(res, finalResult);
  } catch (error) {
    return sendError(res, 'Failed to fetch invoices', 500, (error as Error).message);
  }
}

export async function createInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      clientId,
      projectName,
      projectLocation,
      projectDescription,
      workDetails,
      items,
      discount = { type: 'Fixed', value: 0 },
      additionalCharges = 0,
      gstDetails,
      invoiceDate,
      dueDate,
      paymentTerms,
      notes,
      status = 'Draft',
      sourceQuotationId,
      sourceQuotationNumber,
    } = req.body;

    const client = await Client.findById(clientId);
    if (!client) {
      return sendError(res, 'Selected client does not exist.', 404);
    }

    // Calculate line item totals
    const calculatedItems = (items || []).map((item: any) => ({
      description: item.description,
      quantity: Number(item.quantity) || 0,
      unit: item.unit || 'Units',
      rate: Number(item.rate) || 0,
      amount: calculateItemAmount(item.quantity, item.rate),
    }));

    const subtotal = calculateSubtotal(calculatedItems);
    const discountAmount = calculateDiscountAmount(subtotal, discount.value, discount.type);
    const safeAdditional = round2(Math.max(0, Number(additionalCharges) || 0));
    const taxableAmount = calculateTaxableAmount(subtotal, discountAmount, safeAdditional);

    // GST Breakdown
    const gstBreakdown = calculateGST(
      taxableAmount,
      Boolean(gstDetails?.isApplicable),
      Number(gstDetails?.rate) || 0,
      gstDetails?.supplyType || 'Intra-State'
    );

    const grandTotal = calculateGrandTotal(taxableAmount, gstBreakdown.totalTax);
    const invoiceNumber = await generateNextInvoiceNumber();

    const clientSnapshot = {
      clientName: client.clientName,
      contactPerson: client.contactPerson,
      phone: client.phone,
      email: client.email,
      billingAddress: client.billingAddress,
      city: client.city,
      state: client.state,
      pincode: client.pincode,
      gstin: client.gstin,
    };

    const settings = await CompanySettings.findOne();

    const invoiceData: Partial<IInvoice> = {
      invoiceNumber,
      invoiceType: gstBreakdown.isApplicable ? 'Tax Invoice' : 'Bill of Supply',
      clientId: client._id,
      clientSnapshot,
      projectName,
      projectLocation,
      projectDescription,
      workDetails,
      items: calculatedItems,
      subtotal,
      discount: {
        type: discount.type,
        value: Number(discount.value) || 0,
        amount: discountAmount,
      },
      additionalCharges: safeAdditional,
      taxableAmount,
      gstDetails: gstBreakdown,
      grandTotal,
      amountReceivedSnapshot: 0,
      balanceDueSnapshot: grandTotal,
      invoiceDate: new Date(invoiceDate || Date.now()),
      dueDate: new Date(dueDate),
      paymentTerms: paymentTerms || settings?.invoiceSettings?.defaultPaymentTerms || 'Due upon receipt',
      status: status === 'Issued' ? 'Issued' : 'Draft',
      notes: notes || settings?.invoiceSettings?.defaultNotes,
      sourceQuotationId: sourceQuotationId || undefined,
      sourceQuotationNumber: sourceQuotationNumber || undefined,
    };

    if (status === 'Issued') {
      invoiceData.issuedAt = new Date();
      invoiceData.companySnapshot = settings?.companyProfile as any;
    }

    const invoice = await Invoice.create(invoiceData);

    // If invoice was created from an accepted quotation, update the quotation to Converted
    if (sourceQuotationId) {
      await Quotation.findByIdAndUpdate(sourceQuotationId, {
        $set: {
          status: 'Converted',
          convertedInvoiceId: invoice._id,
          convertedInvoiceNumber: invoice.invoiceNumber,
          convertedAt: new Date(),
        },
      });
    }

    await logAudit({
      action: status === 'Issued' ? 'INVOICE_ISSUED' : 'INVOICE_DRAFT_CREATED',
      entityType: 'Invoice',
      entityId: invoice._id.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
      details: { invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal },
    });

    return sendSuccess(res, invoice, 'Invoice created successfully', 201);
  } catch (error) {
    return sendError(res, 'Failed to create invoice', 500, (error as Error).message);
  }
}

export async function getInvoiceById(req: Request, res: Response) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    const [client, payments] = await Promise.all([
      Client.findById(invoice.clientId),
      Payment.find({
        invoiceId: invoice._id,
        status: 'Completed',
      }).sort({ paymentDate: -1 }),
    ]);

    const resolvedClientSnapshot = client
      ? {
          clientName: client.clientName || invoice.clientSnapshot?.clientName,
          contactPerson: client.contactPerson || invoice.clientSnapshot?.contactPerson,
          phone: client.phone || invoice.clientSnapshot?.phone,
          email: client.email || invoice.clientSnapshot?.email,
          billingAddress: client.billingAddress || invoice.clientSnapshot?.billingAddress,
          city: client.city || invoice.clientSnapshot?.city,
          state: client.state || invoice.clientSnapshot?.state,
          pincode: client.pincode || invoice.clientSnapshot?.pincode,
          gstin: client.gstin || invoice.clientSnapshot?.gstin,
        }
      : invoice.clientSnapshot;

    const totalReceived = round2(payments.reduce((acc, p) => acc + p.amount, 0));
    let balanceDue = calculateOutstandingBalance(invoice.grandTotal, totalReceived);

    let currentStatus: InvoiceStatus = invoice.status;
    if (invoice.status === 'Paid' || (totalReceived >= invoice.grandTotal && invoice.grandTotal > 0 && invoice.status !== 'Draft' && invoice.status !== 'Cancelled')) {
      currentStatus = 'Paid';
      balanceDue = 0;
    } else if (invoice.status === 'Cancelled') {
      currentStatus = 'Cancelled';
    } else if (invoice.status === 'Draft') {
      currentStatus = 'Draft';
    } else if (invoice.status === 'Overdue') {
      currentStatus = 'Overdue';
    } else if (invoice.dueDate && new Date() > new Date(invoice.dueDate) && balanceDue > 0) {
      currentStatus = 'Overdue';
    } else if (totalReceived > 0 && totalReceived < invoice.grandTotal) {
      currentStatus = 'Partially Paid';
    } else if (invoice.status === 'Partially Paid') {
      currentStatus = 'Partially Paid';
    } else {
      currentStatus = 'Issued';
    }

    return sendSuccess(res, {
      ...invoice.toObject(),
      clientSnapshot: resolvedClientSnapshot,
      amountReceivedSnapshot: invoice.status === 'Paid' ? Math.max(totalReceived, invoice.grandTotal) : totalReceived,
      balanceDueSnapshot: balanceDue,
      status: currentStatus,
      payments,
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch invoice details', 500, (error as Error).message);
  }
}

export async function updateInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    const {
      clientId,
      projectName,
      projectLocation,
      projectDescription,
      workDetails,
      items,
      discount,
      additionalCharges,
      gstDetails,
      invoiceDate,
      dueDate,
      paymentTerms,
      notes,
    } = req.body;

    if (clientId && clientId !== invoice.clientId.toString()) {
      const client = await Client.findById(clientId);
      if (client) {
        invoice.clientId = client._id;
        invoice.clientSnapshot = {
          clientName: client.clientName,
          contactPerson: client.contactPerson,
          phone: client.phone,
          email: client.email,
          billingAddress: client.billingAddress,
          city: client.city,
          state: client.state,
          pincode: client.pincode,
          gstin: client.gstin,
        };
      }
    }

    if (projectName) invoice.projectName = projectName;
    if (projectLocation !== undefined) invoice.projectLocation = projectLocation;
    if (projectDescription !== undefined) invoice.projectDescription = projectDescription;
    if (workDetails !== undefined) invoice.workDetails = workDetails;
    if (invoiceDate) invoice.invoiceDate = new Date(invoiceDate);
    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (paymentTerms) invoice.paymentTerms = paymentTerms;
    if (notes !== undefined) invoice.notes = notes;

    if (items) {
      const calculatedItems = items.map((item: any) => ({
        description: item.description,
        quantity: Number(item.quantity) || 0,
        unit: item.unit || 'Units',
        rate: Number(item.rate) || 0,
        amount: calculateItemAmount(item.quantity, item.rate),
      }));
      invoice.items = calculatedItems;
    }

    const subtotal = calculateSubtotal(invoice.items);
    invoice.subtotal = subtotal;

    const discountVal = discount?.value !== undefined ? discount.value : invoice.discount.value;
    const discountType = discount?.type || invoice.discount.type;
    const discountAmount = calculateDiscountAmount(subtotal, discountVal, discountType);

    invoice.discount = {
      type: discountType,
      value: Number(discountVal) || 0,
      amount: discountAmount,
    };

    const additional = additionalCharges !== undefined ? Number(additionalCharges) : invoice.additionalCharges;
    invoice.additionalCharges = round2(Math.max(0, additional));

    invoice.taxableAmount = calculateTaxableAmount(subtotal, discountAmount, invoice.additionalCharges);

    const isGstApplicable = gstDetails?.isApplicable !== undefined ? gstDetails.isApplicable : invoice.gstDetails.isApplicable;
    const gstRate = gstDetails?.rate !== undefined ? gstDetails.rate : invoice.gstDetails.rate;
    const supplyType = gstDetails?.supplyType || invoice.gstDetails.supplyType;

    invoice.gstDetails = calculateGST(invoice.taxableAmount, isGstApplicable, gstRate, supplyType);
    invoice.grandTotal = calculateGrandTotal(invoice.taxableAmount, invoice.gstDetails.totalTax);
    // Recalculate remaining balance based on actual received payments
    const payments = await Payment.find({ invoiceId: invoice._id, status: 'Completed' });
    const received = round2(payments.reduce((acc, p) => acc + p.amount, 0));
    invoice.amountReceivedSnapshot = received;
    invoice.balanceDueSnapshot = calculateOutstandingBalance(invoice.grandTotal, received);

    await invoice.save();

    await logAudit({
      action: 'INVOICE_UPDATED',
      entityType: 'Invoice',
      entityId: invoice._id.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
      details: { invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal },
    });

    return sendSuccess(res, invoice, 'Invoice updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update invoice', 500, (error as Error).message);
  }
}

export async function issueInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    if (invoice.status !== 'Draft') {
      return sendError(res, `Invoice is already in '${invoice.status}' status.`, 400);
    }

    const settings = await CompanySettings.findOne();

    invoice.status = 'Issued';
    invoice.issuedAt = new Date();
    invoice.companySnapshot = settings?.companyProfile as any;

    await invoice.save();

    await logAudit({
      action: 'INVOICE_ISSUED',
      entityType: 'Invoice',
      entityId: invoice._id.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
      details: { invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal },
    });

    return sendSuccess(res, invoice, 'Invoice issued successfully. Official financial record created.');
  } catch (error) {
    return sendError(res, 'Failed to issue invoice', 500, (error as Error).message);
  }
}

export async function cancelInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return sendError(res, 'A cancellation reason is required for audit compliance.', 400);
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    // Check if any completed payments exist
    const paymentCount = await Payment.countDocuments({
      invoiceId: invoice._id,
      status: 'Completed',
    });

    if (paymentCount > 0) {
      return sendError(
        res,
        'Cannot cancel an invoice with recorded payments. Please reverse or reallocate payments first.',
        400
      );
    }

    invoice.status = 'Cancelled';
    invoice.cancelledAt = new Date();
    invoice.cancellationReason = reason.trim();

    await invoice.save();

    await logAudit({
      action: 'INVOICE_CANCELLED',
      entityType: 'Invoice',
      entityId: invoice._id.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
      details: { invoiceNumber: invoice.invoiceNumber, reason: reason.trim() },
    });

    return sendSuccess(res, invoice, 'Invoice cancelled successfully');
  } catch (error) {
    return sendError(res, 'Failed to cancel invoice', 500, (error as Error).message);
  }
}

export async function updateInvoiceStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, reason, amount, paymentMethod, transactionReference } = req.body;
    const allowed = ['Draft', 'Issued', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'];

    if (!allowed.includes(status)) {
      return sendError(res, `Invalid status. Allowed values: ${allowed.join(', ')}`, 400);
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    const oldStatus = invoice.status;
    invoice.status = status;

    // Fetch existing completed payments
    const existingPayments = await Payment.find({
      invoiceId: invoice._id,
      status: 'Completed',
    });
    const currentTotalPaid = round2(existingPayments.reduce((acc, p) => acc + p.amount, 0));
    const remainingBalance = calculateOutstandingBalance(invoice.grandTotal, currentTotalPaid);

    if (status === 'Paid') {
      // Industry Standard: If marked as Paid, any remaining balance is recorded as full settlement!
      if (remainingBalance > 0) {
        await Payment.create({
          clientId: invoice.clientId,
          invoiceId: invoice._id,
          amount: remainingBalance,
          paymentDate: new Date(),
          paymentMethod: paymentMethod || 'Bank Transfer',
          transactionReference: transactionReference || `SETTLE-${Date.now().toString().slice(-6)}`,
          status: 'Completed',
          notes: reason || 'Full invoice balance settled upon marking status as Paid',
          recordedBy: req.user?.id,
        });
      }
      invoice.amountReceivedSnapshot = invoice.grandTotal;
      invoice.balanceDueSnapshot = 0;
    } else if (status === 'Partially Paid') {
      // If partial payment amount is supplied, record it
      const safeAmount = Number(amount);
      if (safeAmount && safeAmount > 0) {
        await Payment.create({
          clientId: invoice.clientId,
          invoiceId: invoice._id,
          amount: round2(safeAmount),
          paymentDate: new Date(),
          paymentMethod: paymentMethod || 'Bank Transfer',
          transactionReference: transactionReference || `PARTIAL-${Date.now().toString().slice(-6)}`,
          status: 'Completed',
          notes: reason || 'Partial payment recorded via status update',
          recordedBy: req.user?.id,
        });
        const updatedTotal = round2(currentTotalPaid + safeAmount);
        invoice.amountReceivedSnapshot = updatedTotal;
        invoice.balanceDueSnapshot = calculateOutstandingBalance(invoice.grandTotal, updatedTotal);
      } else {
        invoice.amountReceivedSnapshot = currentTotalPaid;
        invoice.balanceDueSnapshot = remainingBalance;
      }
    } else if (status === 'Issued') {
      if (!invoice.issuedAt) {
        invoice.issuedAt = new Date();
      }
      invoice.amountReceivedSnapshot = currentTotalPaid;
      invoice.balanceDueSnapshot = remainingBalance;
    } else if (status === 'Cancelled') {
      invoice.cancelledAt = new Date();
      invoice.cancellationReason = reason || 'Manual status change';
      invoice.amountReceivedSnapshot = currentTotalPaid;
      invoice.balanceDueSnapshot = remainingBalance;
    } else {
      invoice.amountReceivedSnapshot = currentTotalPaid;
      invoice.balanceDueSnapshot = remainingBalance;
    }

    await invoice.save();

    await logAudit({
      action: 'INVOICE_STATUS_CHANGED',
      entityType: 'Invoice',
      entityId: invoice._id.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
      details: { from: oldStatus, to: status, reason },
    });

    return sendSuccess(res, invoice, `Invoice status updated to ${status}`);
  } catch (error) {
    return sendError(res, 'Failed to update invoice status', 500, (error as Error).message);
  }
}

export async function deleteInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    // Clean up associated payment records
    await Payment.deleteMany({ invoiceId: invoice._id });
    await Invoice.findByIdAndDelete(req.params.id);

    await logAudit({
      action: 'INVOICE_DELETED',
      entityType: 'Invoice',
      entityId: String(req.params.id),
      userId: req.user?.id,
      userName: req.user?.name,
      details: { invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal },
    });

    return sendSuccess(res, null, 'Invoice deleted successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete invoice', 500, (error as Error).message);
  }
}

export async function downloadPDF(req: Request, res: Response) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    const [client, payments, settings] = await Promise.all([
      Client.findById(invoice.clientId),
      Payment.find({
        invoiceId: invoice._id,
        status: 'Completed',
      }),
      CompanySettings.findOne(),
    ]);

    if (client) {
      invoice.clientSnapshot = {
        clientName: client.clientName || invoice.clientSnapshot?.clientName,
        contactPerson: client.contactPerson || invoice.clientSnapshot?.contactPerson,
        phone: client.phone || invoice.clientSnapshot?.phone,
        email: client.email || invoice.clientSnapshot?.email,
        billingAddress: client.billingAddress || invoice.clientSnapshot?.billingAddress,
        city: client.city || invoice.clientSnapshot?.city,
        state: client.state || invoice.clientSnapshot?.state,
        pincode: client.pincode || invoice.clientSnapshot?.pincode,
        gstin: client.gstin || invoice.clientSnapshot?.gstin,
      };
    }

    const received = round2(payments.reduce((acc, p) => acc + p.amount, 0));
    invoice.amountReceivedSnapshot = received;
    invoice.balanceDueSnapshot = calculateOutstandingBalance(invoice.grandTotal, received);

    const pdfBuffer = await generateInvoicePDF(invoice, settings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.end(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    return sendError(res, 'Failed to generate PDF invoice', 500, (error as Error).message);
  }
}

export async function getWhatsAppShareText(req: Request, res: Response) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    const payments = await Payment.find({
      invoiceId: invoice._id,
      status: 'Completed',
    });

    const received = round2(payments.reduce((acc, p) => acc + p.amount, 0));
    const balance = calculateOutstandingBalance(invoice.grandTotal, received);

    // Resolve latest client particulars so PDF and WhatsApp reflect updated phone/address
    const client = await Client.findById(invoice.clientId);
    if (client) {
      invoice.clientSnapshot = {
        clientName: client.clientName || invoice.clientSnapshot?.clientName,
        contactPerson: client.contactPerson || invoice.clientSnapshot?.contactPerson,
        phone: client.phone || invoice.clientSnapshot?.phone,
        email: client.email || invoice.clientSnapshot?.email,
        billingAddress: client.billingAddress || invoice.clientSnapshot?.billingAddress,
        city: client.city || invoice.clientSnapshot?.city,
        state: client.state || invoice.clientSnapshot?.state,
        pincode: client.pincode || invoice.clientSnapshot?.pincode,
        gstin: client.gstin || invoice.clientSnapshot?.gstin,
      };
    }

    const clientName = invoice.clientSnapshot?.clientName || 'Client';
    const projectName = invoice.projectName;
    const phone = invoice.clientSnapshot?.phone || '';

    const pdfUrl = `https://royal-billing-software.onrender.com/api/invoices/${invoice._id}/pdf`;

    const text =
      `Hello ${clientName},\n\n` +
      `Your official Tax Invoice for *${projectName}* is ready.\n\n` +
      `📄 *View / Download Invoice PDF:*\n${pdfUrl}\n\n` +
      `*Invoice Number:* ${invoice.invoiceNumber}\n` +
      `*Invoice Date:* ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}\n` +
      `*Invoice Amount:* ${formatINR(invoice.grandTotal)}\n` +
      `*Amount Received:* ${formatINR(received)}\n` +
      `*Balance Due:* ${formatINR(balance)}\n` +
      `*Payment Status:* ${invoice.status.toUpperCase()}\n\n` +
      `Thank you for partnering with Royal Engineering & Construction!`;

    // Strip non-digits for WhatsApp API link (defaults to 8891003031 if not provided)
    const cleanPhone = phone.replace(/[^0-9]/g, '') || '8891003031';
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const waLink = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;

    return sendSuccess(res, {
      text,
      phone,
      whatsappUrl: waLink,
    });
  } catch (error) {
    return sendError(res, 'Failed to generate WhatsApp share text', 500, (error as Error).message);
  }
}

