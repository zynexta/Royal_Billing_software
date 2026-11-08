import { Request, Response } from 'express';
import mongoose from 'express';
import { Quotation, IQuotation } from '../models/Quotation.js';
import { Invoice, IInvoice } from '../models/Invoice.js';
import { Client } from '../models/Client.js';
import { CompanySettings } from '../models/CompanySettings.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { generateNextQuotationNumber } from '../services/quotationNumberService.js';
import { generateNextInvoiceNumber } from '../services/invoiceNumberService.js';
import { QuotationStatus } from '../types/index.js';
import {
  calculateDiscountAmount,
  calculateGrandTotal,
  calculateGST,
  calculateItemAmount,
  calculateSubtotal,
  calculateTaxableAmount,
  round2,
} from '../services/calculationService.js';
import { generateQuotationPDF, formatINR } from '../services/quotationPdfService.js';
import { logAudit } from '../services/auditService.js';

export async function getQuotations(req: Request, res: Response) {
  try {
    const { search, status, clientId, startDate, endDate } = req.query;

    const filter: any = {};

    if (clientId && typeof clientId === 'string') {
      filter.clientId = clientId;
    }

    if (startDate || endDate) {
      filter.quotationDate = {};
      if (startDate) filter.quotationDate.$gte = new Date(startDate as string);
      if (endDate) filter.quotationDate.$lte = new Date(endDate as string);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { quotationNumber: searchRegex },
        { projectName: searchRegex },
        { 'clientSnapshot.clientName': searchRegex },
      ];
    }

    const quotations = await Quotation.find(filter).sort({ quotationDate: -1, createdAt: -1 });

    const now = new Date();

    // Dynamically evaluate expired status if validity passed and still in Draft or Sent
    const evaluatedQuotations = quotations.map((q) => {
      let currentStatus: QuotationStatus = q.status;
      if (
        (q.status === 'Sent' || q.status === 'Draft') &&
        q.validUntil &&
        new Date(q.validUntil) < now
      ) {
        currentStatus = 'Expired';
      }
      return {
        ...q.toObject(),
        status: currentStatus,
      };
    });

    // If status filter was requested
    let finalQuotations = evaluatedQuotations;
    if (status && typeof status === 'string' && status !== 'All') {
      finalQuotations = evaluatedQuotations.filter((q) => q.status === status);
    }

    return sendSuccess(res, finalQuotations);
  } catch (error) {
    return sendError(res, 'Failed to fetch quotations', 500, (error as Error).message);
  }
}

export async function getQuotationById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const quotation = await Quotation.findById(id).populate('convertedInvoiceId');

    if (!quotation) {
      return sendError(res, 'Quotation not found', 404);
    }

    return sendSuccess(res, quotation);
  } catch (error) {
    return sendError(res, 'Failed to fetch quotation details', 500, (error as Error).message);
  }
}

export async function createQuotation(req: AuthenticatedRequest, res: Response) {
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
      estimatedGstDetails,
      quotationDate,
      validUntil,
      paymentTerms,
      termsAndConditions,
      notes,
      status = 'Draft',
    } = req.body;

    const client = await Client.findById(clientId);
    if (!client) {
      return sendError(res, 'Selected client does not exist.', 404);
    }

    // Calculate line items
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
      Boolean(estimatedGstDetails?.isApplicable),
      Number(estimatedGstDetails?.rate) || 0,
      estimatedGstDetails?.supplyType || 'Intra-State'
    );

    const estimatedGrandTotal = calculateGrandTotal(taxableAmount, gstBreakdown.totalTax);
    const quotationNumber = await generateNextQuotationNumber();

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

    const qDate = quotationDate ? new Date(quotationDate) : new Date();
    const defaultValidityDays = settings?.quotationSettings?.defaultValidityDays || 30;
    const vUntil = validUntil
      ? new Date(validUntil)
      : new Date(qDate.getTime() + defaultValidityDays * 24 * 60 * 60 * 1000);

    const newQuotation = await Quotation.create({
      quotationNumber,
      clientId: client._id,
      clientSnapshot,
      companySnapshot: settings?.companyProfile,
      projectName,
      projectLocation,
      projectDescription,
      workDetails,
      items: calculatedItems,
      subtotal,
      discount: {
        type: discount.type || 'Fixed',
        value: discount.value || 0,
        amount: discountAmount,
      },
      additionalCharges: safeAdditional,
      taxableAmount,
      estimatedGstDetails: gstBreakdown,
      estimatedGrandTotal,
      quotationDate: qDate,
      validUntil: vUntil,
      paymentTerms:
        paymentTerms ||
        settings?.quotationSettings?.defaultPaymentTerms ||
        'Mobilization Advance: 30% | Running Work: 60% | Final Handover: 10%',
      termsAndConditions:
        termsAndConditions || settings?.quotationSettings?.termsAndConditions,
      notes: notes || settings?.quotationSettings?.defaultNotes,
      status: status === 'Sent' ? 'Sent' : 'Draft',
      sentAt: status === 'Sent' ? new Date() : undefined,
    });

    if (req.user) {
      await logAudit({
        action: 'QUOTATION_CREATED',
        entityType: 'Quotation',
        entityId: newQuotation._id.toString(),
        userId: req.user.id,
        userName: req.user.name,
        details: { quotationNumber: newQuotation.quotationNumber, client: client.clientName },
      });
    }

    return sendSuccess(res, newQuotation, 'Quotation created successfully', 201);
  } catch (error) {
    return sendError(res, 'Failed to create quotation', 500, (error as Error).message);
  }
}

export async function updateQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const quotation = await Quotation.findById(id);

    if (!quotation) {
      return sendError(res, 'Quotation not found', 404);
    }

    if (quotation.status === 'Converted') {
      return sendError(res, 'Cannot modify a quotation that has already been converted to an invoice.', 400);
    }

    const {
      projectName,
      projectLocation,
      projectDescription,
      workDetails,
      items,
      discount,
      additionalCharges,
      estimatedGstDetails,
      quotationDate,
      validUntil,
      paymentTerms,
      termsAndConditions,
      notes,
    } = req.body;

    if (items) {
      quotation.items = items.map((item: any) => ({
        description: item.description,
        quantity: Number(item.quantity) || 0,
        unit: item.unit || 'Units',
        rate: Number(item.rate) || 0,
        amount: calculateItemAmount(item.quantity, item.rate),
      }));
      quotation.subtotal = calculateSubtotal(quotation.items);
    }

    if (discount) {
      quotation.discount.type = discount.type || quotation.discount.type;
      quotation.discount.value = discount.value ?? quotation.discount.value;
      quotation.discount.amount = calculateDiscountAmount(
        quotation.subtotal,
        quotation.discount.value,
        quotation.discount.type
      );
    }

    if (additionalCharges !== undefined) {
      quotation.additionalCharges = round2(Math.max(0, Number(additionalCharges) || 0));
    }

    quotation.taxableAmount = calculateTaxableAmount(
      quotation.subtotal,
      quotation.discount.amount,
      quotation.additionalCharges
    );

    if (estimatedGstDetails) {
      quotation.estimatedGstDetails = calculateGST(
        quotation.taxableAmount,
        Boolean(estimatedGstDetails.isApplicable),
        Number(estimatedGstDetails.rate) || 0,
        estimatedGstDetails.supplyType || 'Intra-State'
      );
    }

    quotation.estimatedGrandTotal = calculateGrandTotal(
      quotation.taxableAmount,
      quotation.estimatedGstDetails.totalTax
    );

    if (projectName) quotation.projectName = projectName;
    if (projectLocation !== undefined) quotation.projectLocation = projectLocation;
    if (projectDescription !== undefined) quotation.projectDescription = projectDescription;
    if (workDetails !== undefined) quotation.workDetails = workDetails;
    if (quotationDate) quotation.quotationDate = new Date(quotationDate);
    if (validUntil) quotation.validUntil = new Date(validUntil);
    if (paymentTerms !== undefined) quotation.paymentTerms = paymentTerms;
    if (termsAndConditions !== undefined) quotation.termsAndConditions = termsAndConditions;
    if (notes !== undefined) quotation.notes = notes;

    await quotation.save();

    if (req.user) {
      await logAudit({
        action: 'QUOTATION_UPDATED',
        entityType: 'Quotation',
        entityId: quotation._id.toString(),
        userId: req.user.id,
        userName: req.user.name,
        details: { quotationNumber: quotation.quotationNumber },
      });
    }

    return sendSuccess(res, quotation, 'Quotation updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update quotation', 500, (error as Error).message);
  }
}

export async function issueQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const quotation = await Quotation.findById(id);

    if (!quotation) {
      return sendError(res, 'Quotation not found', 404);
    }

    quotation.status = 'Sent';
    quotation.sentAt = new Date();
    await quotation.save();

    if (req.user) {
      await logAudit({
        action: 'QUOTATION_ISSUED',
        entityType: 'Quotation',
        entityId: quotation._id.toString(),
        userId: req.user.id,
        userName: req.user.name,
        details: { quotationNumber: quotation.quotationNumber },
      });
    }

    return sendSuccess(res, quotation, 'Quotation marked as Sent');
  } catch (error) {
    return sendError(res, 'Failed to issue quotation', 500, (error as Error).message);
  }
}

export async function sendQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const quotation = await Quotation.findById(id);

    if (!quotation) {
      return sendError(res, 'Quotation not found', 404);
    }

    if (quotation.status === 'Draft') {
      quotation.status = 'Sent';
    }
    quotation.sentAt = new Date();
    await quotation.save();

    return sendSuccess(res, quotation, 'Quotation send timestamp recorded');
  } catch (error) {
    return sendError(res, 'Failed to record send action', 500, (error as Error).message);
  }
}

export async function acceptQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { approvedBy, approvalDate, approvalMethod, approvalNotes } = req.body;

    if (!approvedBy || !approvedBy.trim()) {
      return sendError(res, 'Approver name is required to record acceptance.', 400);
    }

    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return sendError(res, 'Quotation not found', 404);
    }

    if (quotation.status === 'Converted') {
      return sendError(res, 'This quotation has already been converted into a Tax Invoice.', 400);
    }

    quotation.status = 'Accepted';
    quotation.approvalDetails = {
      approvedBy: approvedBy.trim(),
      approvalDate: approvalDate ? new Date(approvalDate) : new Date(),
      approvalMethod: approvalMethod || 'WhatsApp',
      approvalNotes: approvalNotes ? approvalNotes.trim() : '',
    };

    await quotation.save();

    if (req.user) {
      await logAudit({
        action: 'QUOTATION_ACCEPTED',
        entityType: 'Quotation',
        entityId: quotation._id.toString(),
        userId: req.user.id,
        userName: req.user.name,
        details: { quotationNumber: quotation.quotationNumber, approvedBy },
      });
    }

    return sendSuccess(res, quotation, 'Quotation approved and marked as Accepted');
  } catch (error) {
    return sendError(res, 'Failed to record approval', 500, (error as Error).message);
  }
}

export async function rejectQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return sendError(res, 'Quotation not found', 404);
    }

    if (quotation.status === 'Converted') {
      return sendError(res, 'Cannot reject a quotation that has already been converted into a Tax Invoice.', 400);
    }

    quotation.status = 'Rejected';
    if (reason) {
      quotation.notes = quotation.notes
        ? `${quotation.notes}\n[Rejection Reason: ${reason}]`
        : `[Rejection Reason: ${reason}]`;
    }

    await quotation.save();

    if (req.user) {
      await logAudit({
        action: 'QUOTATION_REJECTED',
        entityType: 'Quotation',
        entityId: quotation._id.toString(),
        userId: req.user.id,
        userName: req.user.name,
        details: { quotationNumber: quotation.quotationNumber, reason },
      });
    }

    return sendSuccess(res, quotation, 'Quotation marked as Rejected');
  } catch (error) {
    return sendError(res, 'Failed to reject quotation', 500, (error as Error).message);
  }
}

/**
 * Atomic one-click conversion from Accepted Quotation to Tax Invoice
 */
export async function convertToInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { invoiceDate, dueDate, notes, paymentTerms } = req.body || {};

    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return sendError(res, 'Quotation not found', 404);
    }

    // Strict validation rules as specified in Section 5, 8, 9, 17
    if (quotation.status !== 'Accepted') {
      return sendError(
        res,
        `Cannot convert quotation with status '${quotation.status}'. The quotation must be explicitly marked as 'Accepted' by the client first.`,
        400
      );
    }

    if (quotation.convertedInvoiceId) {
      return sendError(
        res,
        `This quotation has already been converted to Tax Invoice ${quotation.convertedInvoiceNumber || ''}. Duplicate conversions are strictly disallowed.`,
        400
      );
    }

    // Fetch client to ensure fresh data snapshot
    const client = await Client.findById(quotation.clientId);
    const clientSnapshot = client
      ? {
          clientName: client.clientName,
          contactPerson: client.contactPerson,
          phone: client.phone,
          email: client.email,
          billingAddress: client.billingAddress,
          city: client.city,
          state: client.state,
          pincode: client.pincode,
          gstin: client.gstin,
        }
      : quotation.clientSnapshot;

    // Recalculate line item amounts and tax totals cleanly
    const calculatedItems = quotation.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity) || 0,
      unit: item.unit || 'Units',
      rate: Number(item.rate) || 0,
      amount: calculateItemAmount(item.quantity, item.rate),
    }));

    const subtotal = calculateSubtotal(calculatedItems);
    const discountAmount = calculateDiscountAmount(
      subtotal,
      quotation.discount.value,
      quotation.discount.type
    );
    const taxableAmount = calculateTaxableAmount(
      subtotal,
      discountAmount,
      quotation.additionalCharges || 0
    );

    // Confirm GST treatment at the time of conversion
    const gstBreakdown = calculateGST(
      taxableAmount,
      Boolean(quotation.estimatedGstDetails?.isApplicable),
      Number(quotation.estimatedGstDetails?.rate) || 18,
      quotation.estimatedGstDetails?.supplyType || 'Intra-State'
    );

    const grandTotal = calculateGrandTotal(taxableAmount, gstBreakdown.totalTax);
    const invoiceNumber = await generateNextInvoiceNumber();

    const invDate = invoiceDate ? new Date(invoiceDate) : new Date();
    const dDate = dueDate ? new Date(dueDate) : new Date(invDate.getTime() + 15 * 24 * 60 * 60 * 1000);

    const settings = await CompanySettings.findOne();

    // Create the Tax Invoice with quotation links
    const newInvoice = await Invoice.create({
      invoiceNumber,
      invoiceType: gstBreakdown.isApplicable ? 'Tax Invoice' : 'Bill of Supply',
      clientId: quotation.clientId,
      clientSnapshot,
      companySnapshot: settings?.companyProfile,
      projectName: quotation.projectName,
      projectLocation: quotation.projectLocation,
      projectDescription: quotation.projectDescription,
      workDetails: quotation.workDetails,
      items: calculatedItems,
      subtotal,
      discount: {
        type: quotation.discount.type || 'Fixed',
        value: quotation.discount.value || 0,
        amount: discountAmount,
      },
      additionalCharges: quotation.additionalCharges || 0,
      taxableAmount,
      gstDetails: gstBreakdown,
      grandTotal,
      amountReceivedSnapshot: 0,
      balanceDueSnapshot: grandTotal,
      invoiceDate: invDate,
      dueDate: dDate,
      paymentTerms:
        paymentTerms ||
        quotation.paymentTerms ||
        settings?.invoiceSettings?.defaultPaymentTerms ||
        'Payment due within 15 days.',
      notes: notes || quotation.notes || settings?.invoiceSettings?.defaultNotes,
      status: 'Issued',
      issuedAt: new Date(),
      sourceQuotationId: quotation._id,
      sourceQuotationNumber: quotation.quotationNumber,
    });

    // Mark quotation as Converted
    quotation.status = 'Converted';
    quotation.convertedInvoiceId = newInvoice._id;
    quotation.convertedInvoiceNumber = newInvoice.invoiceNumber;
    quotation.convertedAt = new Date();
    await quotation.save();

    if (req.user) {
      await logAudit({
        action: 'QUOTATION_CONVERTED',
        entityType: 'Quotation',
        entityId: quotation._id.toString(),
        userId: req.user.id,
        userName: req.user.name,
        details: {
          quotationNumber: quotation.quotationNumber,
          invoiceNumber: newInvoice.invoiceNumber,
        },
      });
    }

    return sendSuccess(
      res,
      {
        quotation,
        invoice: newInvoice,
      },
      `Quotation ${quotation.quotationNumber} successfully converted to Tax Invoice ${newInvoice.invoiceNumber}`,
      201
    );
  } catch (error) {
    return sendError(res, 'Failed to convert quotation to invoice', 500, (error as Error).message);
  }
}

export async function downloadQuotationPDF(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const quotation = await Quotation.findById(id);

    if (!quotation) {
      return sendError(res, 'Quotation not found', 404);
    }

    const settings = await CompanySettings.findOne();
    const pdfBuffer = await generateQuotationPDF(quotation, settings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${quotation.quotationNumber}.pdf"`);
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return sendError(res, 'Failed to generate quotation PDF', 500, (error as Error).message);
  }
}

export async function getQuotationWhatsAppShare(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const quotation = await Quotation.findById(id);

    if (!quotation) {
      return sendError(res, 'Quotation not found', 404);
    }

    const clientName = quotation.clientSnapshot?.clientName || 'Client';
    const projectName = quotation.projectName || 'Project';
    const validUntilFormatted = new Date(quotation.validUntil).toLocaleDateString('en-IN');
    const pdfUrl = `${req.protocol}://${req.get('host')}/api/quotations/${quotation._id}/pdf`;

    const message =
      `Hello ${clientName},\n\n` +
      `Please find the quotation for your project:\n\n` +
      `*Project:* ${projectName}\n` +
      `*Quotation Number:* ${quotation.quotationNumber}\n` +
      `*Estimated Amount:* ${formatINR(quotation.estimatedGrandTotal)}\n` +
      `*Valid Until:* ${validUntilFormatted}\n\n` +
      `*View / Download Quotation PDF:* ${pdfUrl}\n\n` +
      `Please review the quotation and share your approval.\n\n` +
      `Thank you,\nROYAL Engineering & Construction`;

    const cleanPhone = quotation.clientSnapshot?.phone?.replace(/[^0-9]/g, '') || '';
    const phone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    return sendSuccess(res, {
      message,
      phone,
      whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      pdfUrl,
    });
  } catch (error) {
    return sendError(res, 'Failed to generate WhatsApp share message', 500, (error as Error).message);
  }
}

export async function deleteQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const quotation = await Quotation.findById(id);

    if (!quotation) {
      return sendError(res, 'Quotation not found', 404);
    }

    if (quotation.status === 'Converted') {
      return sendError(
        res,
        'Cannot delete a quotation that has already been converted to a Tax Invoice.',
        400
      );
    }

    await quotation.deleteOne();

    if (req.user) {
      await logAudit({
        action: 'QUOTATION_DELETED',
        entityType: 'Quotation',
        entityId: id as string,
        userId: req.user.id,
        userName: req.user.name,
        details: { quotationNumber: quotation.quotationNumber },
      });
    }

    return sendSuccess(res, null, 'Quotation deleted successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete quotation', 500, (error as Error).message);
  }
}
