import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Payment } from '../models/Payment.js';
import { Invoice } from '../models/Invoice.js';
import { Client } from '../models/Client.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  calculateOutstandingBalance,
  calculatePaymentStatus,
  round2,
} from '../services/calculationService.js';
import { logAudit } from '../services/auditService.js';

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export async function getPayments(req: Request, res: Response) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const { search, invoiceId, clientId, status, paymentMethod, startDate, endDate } = req.query;

    const filter: any = {};
    if (status && typeof status === 'string' && status !== 'All') {
      filter.status = status;
    }
    if (paymentMethod && typeof paymentMethod === 'string' && paymentMethod !== 'All') {
      filter.paymentMethod = paymentMethod;
    }
    if (invoiceId && typeof invoiceId === 'string') {
      filter.invoiceId = invoiceId;
    }
    if (clientId && typeof clientId === 'string') {
      filter.clientId = clientId;
    }
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate as string);
      if (endDate) filter.paymentDate.$lte = new Date(endDate as string);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const sanitized = escapeRegex(search.trim());
      const searchRegex = new RegExp(sanitized, 'i');
      const digitsOnly = search.trim().replace(/\D/g, '');

      const clientConditions: any[] = [
        { clientName: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
      ];
      if (digitsOnly.length >= 4) {
        clientConditions.push({ phone: new RegExp(digitsOnly, 'i') });
      }

      const [matchingClients, matchingInvoices] = await Promise.all([
        Client.find({ $or: clientConditions }).select('_id'),
        Invoice.find({
          $or: [{ invoiceNumber: searchRegex }, { projectName: searchRegex }],
        }).select('_id'),
      ]);

      const clientIds = matchingClients.map((c) => c._id);
      const invoiceIds = matchingInvoices.map((i) => i._id);

      filter.$or = [
        { clientId: { $in: clientIds } },
        { invoiceId: { $in: invoiceIds } },
        { transactionReference: searchRegex },
        { notes: searchRegex },
      ];
    }

    const payments = await Payment.find(filter)
      .populate('invoiceId', 'invoiceNumber projectName grandTotal status')
      .populate('clientId', 'clientName phone')
      .sort({ createdAt: -1, paymentDate: -1 });

    return sendSuccess(res, payments);
  } catch (error) {
    return sendError(res, 'Failed to fetch payments', 500, (error as Error).message);
  }
}

export async function createPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { clientId, invoiceId, amount, paymentDate, paymentMethod, transactionReference, notes } = req.body;

    const safeAmount = round2(Number(amount));
    if (safeAmount <= 0) {
      return sendError(res, 'Payment amount must be greater than zero.', 400);
    }

    // Verify client
    const client = await Client.findById(clientId);
    if (!client) {
      return sendError(res, 'Client not found.', 404);
    }

    let targetInvoice: any = null;

    if (invoiceId) {
      targetInvoice = await Invoice.findById(invoiceId);
      if (!targetInvoice) {
        return sendError(res, 'Invoice not found.', 404);
      }

      if (targetInvoice.status === 'Cancelled') {
        return sendError(res, 'Cannot apply payments to a cancelled invoice.', 400);
      }

      // Calculate existing received payments for this invoice
      const existingPayments = await Payment.find({
        invoiceId: targetInvoice._id,
        status: 'Completed',
      });

      const currentTotalPaid = round2(existingPayments.reduce((acc, p) => acc + p.amount, 0));
      const remainingBalance = calculateOutstandingBalance(targetInvoice.grandTotal, currentTotalPaid);

      if (safeAmount > remainingBalance) {
        return sendError(
          res,
          `Payment amount (₹${safeAmount}) exceeds remaining invoice balance of ₹${remainingBalance}. Overpayment is prevented to preserve financial accuracy.`,
          400
        );
      }
    }

    let finalPaymentDate = new Date();
    if (paymentDate) {
      const parsed = new Date(paymentDate);
      if (!isNaN(parsed.getTime())) {
        const now = new Date();
        const todayIso = now.toISOString().split('T')[0];
        if (typeof paymentDate === 'string' && paymentDate.startsWith(todayIso)) {
          finalPaymentDate = now;
        } else {
          parsed.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
          finalPaymentDate = parsed;
        }
      }
    }

    let payment: any = null;

    // If payment is against a specific invoice, apply directly
    if (targetInvoice) {
      payment = await Payment.create({
        clientId: client._id,
        invoiceId: targetInvoice._id,
        amount: safeAmount,
        paymentDate: finalPaymentDate,
        paymentMethod,
        transactionReference: transactionReference?.trim(),
        notes: notes?.trim(),
        status: 'Completed',
      });

      const allPayments = await Payment.find({
        invoiceId: targetInvoice._id,
        status: 'Completed',
      });

      const updatedPaid = round2(allPayments.reduce((acc, p) => acc + p.amount, 0));
      const updatedBalance = calculateOutstandingBalance(targetInvoice.grandTotal, updatedPaid);

      targetInvoice.amountReceivedSnapshot = updatedPaid;
      targetInvoice.balanceDueSnapshot = updatedBalance;

      // Update status
      if (targetInvoice.status !== 'Draft' && targetInvoice.status !== 'Cancelled') {
        targetInvoice.status = calculatePaymentStatus(
          targetInvoice.grandTotal,
          updatedPaid,
          targetInvoice.dueDate,
          false,
          false
        );
      }
      await targetInvoice.save();
    } else {
      // Auto-allocate client-level payment across client's pending invoices (FIFO)
      const pendingInvoices = await Invoice.find({
        clientId: client._id,
        status: { $in: ['Issued', 'Partially Paid', 'Overdue'] },
      }).sort({ invoiceDate: 1, createdAt: 1 });

      let remaining = safeAmount;

      for (const inv of pendingInvoices) {
        if (remaining <= 0) break;

        const currentPaid = round2(
          (await Payment.find({ invoiceId: inv._id, status: 'Completed' })).reduce((acc, p) => acc + p.amount, 0)
        );
        const invDue = calculateOutstandingBalance(inv.grandTotal, currentPaid);

        if (invDue > 0) {
          const allocate = round2(Math.min(remaining, invDue));

          const allocatedPayment = await Payment.create({
            clientId: client._id,
            invoiceId: inv._id,
            amount: allocate,
            paymentDate: finalPaymentDate,
            paymentMethod,
            transactionReference: transactionReference?.trim(),
            notes: notes ? `${notes} (Applied to ${inv.invoiceNumber})` : `Applied to invoice ${inv.invoiceNumber}`,
            status: 'Completed',
          });

          if (!payment) payment = allocatedPayment;

          const newPaid = round2(currentPaid + allocate);
          const newDue = calculateOutstandingBalance(inv.grandTotal, newPaid);

          inv.amountReceivedSnapshot = newPaid;
          inv.balanceDueSnapshot = newDue;
          inv.status = calculatePaymentStatus(inv.grandTotal, newPaid, inv.dueDate, false, false);
          await inv.save();

          remaining = round2(remaining - allocate);
        }
      }

      // If any amount remains after settling all pending invoices, save as pure advance
      if (remaining > 0 || pendingInvoices.length === 0) {
        const advPayment = await Payment.create({
          clientId: client._id,
          amount: remaining,
          paymentDate: finalPaymentDate,
          paymentMethod,
          transactionReference: transactionReference?.trim(),
          notes: notes ? `${notes} (General Advance)` : 'Client Advance Credit',
          status: 'Completed',
        });
        if (!payment) payment = advPayment;
      }
    }

    await logAudit({
      action: 'PAYMENT_RECORDED',
      entityType: 'Payment',
      entityId: payment._id.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
      details: {
        amount: safeAmount,
        invoiceNumber: targetInvoice ? targetInvoice.invoiceNumber : 'Client Advance',
        paymentMethod,
      },
    });

    return sendSuccess(res, payment, 'Payment recorded successfully', 201);
  } catch (error) {
    return sendError(res, 'Failed to record payment', 500, (error as Error).message);
  }
}

export async function getPaymentById(req: Request, res: Response) {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('invoiceId')
      .populate('clientId');
    if (!payment) {
      return sendError(res, 'Payment not found', 404);
    }

    return sendSuccess(res, payment);
  } catch (error) {
    return sendError(res, 'Failed to fetch payment', 500, (error as Error).message);
  }
}

export async function reversePayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return sendError(res, 'Reversal reason is required for accounting audit trail.', 400);
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return sendError(res, 'Payment not found', 404);
    }

    if (payment.status === 'Reversed') {
      return sendError(res, 'Payment has already been reversed.', 400);
    }

    payment.status = 'Reversed';
    payment.reversedAt = new Date();
    payment.reversalReason = reason.trim();
    await payment.save();

    // If attached to invoice, recalculate invoice balance
    if (payment.invoiceId) {
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        const remainingCompleted = await Payment.find({
          invoiceId: invoice._id,
          status: 'Completed',
        });

        const updatedPaid = round2(remainingCompleted.reduce((acc, p) => acc + p.amount, 0));
        const updatedBalance = calculateOutstandingBalance(invoice.grandTotal, updatedPaid);

        invoice.amountReceivedSnapshot = updatedPaid;
        invoice.balanceDueSnapshot = updatedBalance;

        if (invoice.status !== 'Draft' && invoice.status !== 'Cancelled') {
          invoice.status = calculatePaymentStatus(invoice.grandTotal, updatedPaid, invoice.dueDate, false, false);
        }
        await invoice.save();
      }
    }

    await logAudit({
      action: 'PAYMENT_REVERSED',
      entityType: 'Payment',
      entityId: payment._id.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
      details: { amount: payment.amount, reason: reason.trim() },
    });

    return sendSuccess(res, payment, 'Payment reversed and invoice balances updated.');
  } catch (error) {
    return sendError(res, 'Failed to reverse payment', 500, (error as Error).message);
  }
}

