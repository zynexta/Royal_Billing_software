import { Request, Response } from 'express';
import { Invoice } from '../models/Invoice.js';
import { Quotation } from '../models/Quotation.js';
import { Payment } from '../models/Payment.js';
import { Client } from '../models/Client.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { round2 } from '../services/calculationService.js';

export async function getDashboardSummary(req: Request, res: Response) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const { period, startDate, endDate } = req.query;

    const dateFilter: any = {};
    const now = new Date();

    if (period === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter.$gte = firstDay;
    } else if (period === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      dateFilter.$gte = firstDay;
      dateFilter.$lte = lastDay;
    } else if (period === 'this_year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      dateFilter.$gte = firstDay;
    } else if (startDate || endDate) {
      if (startDate) dateFilter.$gte = new Date(startDate as string);
      if (endDate) dateFilter.$lte = new Date(endDate as string);
    }

    const invoiceQuery: any = { status: { $ne: 'Cancelled' } };
    const paymentQuery: any = { status: 'Completed' };

    const quotationQuery: any = {};
    if (Object.keys(dateFilter).length > 0) {
      invoiceQuery.invoiceDate = dateFilter;
      paymentQuery.paymentDate = dateFilter;
      quotationQuery.quotationDate = dateFilter;
    }

    const [invoices, payments, clientCount, quotations] = await Promise.all([
      Invoice.find(invoiceQuery),
      Payment.find(paymentQuery),
      Client.countDocuments({ isArchived: false }),
      Quotation.find(quotationQuery),
    ]);

    const activeInvoices = invoices.filter((inv) => inv.status !== 'Draft' && inv.status !== 'Cancelled');
    const totalInvoices = invoices.length;
    const totalProjectValue = round2(activeInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0));

    // Calculate actual unpaid invoice balance across all active projects
    const outstandingAmount = round2(
      activeInvoices.reduce((sum, inv) => {
        const due = typeof inv.balanceDueSnapshot === 'number'
          ? inv.balanceDueSnapshot
          : Math.max(0, inv.grandTotal - (inv.amountReceivedSnapshot || 0));
        return sum + Math.max(0, due);
      }, 0)
    );

    // Calculate actual payments verified against active invoices
    const totalInvoicedReceived = round2(
      activeInvoices.reduce((sum, inv) => {
        const recv = typeof inv.amountReceivedSnapshot === 'number'
          ? inv.amountReceivedSnapshot
          : Math.max(0, inv.grandTotal - (inv.balanceDueSnapshot || 0));
        return sum + Math.max(0, recv);
      }, 0)
    );

    // Total cash deposits received into bank including unlinked client advances
    const totalCashCollected = round2(payments.reduce((sum, p) => sum + p.amount, 0));
    const totalAdvances = round2(payments.filter((p) => !p.invoiceId).reduce((sum, p) => sum + p.amount, 0));

    const paidInvoicesCount = invoices.filter((inv) => inv.status === 'Paid').length;
    const pendingInvoicesCount = invoices.filter(
      (inv) => inv.status === 'Issued' || inv.status === 'Partially Paid' || inv.status === 'Overdue'
    ).length;
    const draftInvoicesCount = invoices.filter((inv) => inv.status === 'Draft').length;

    // Quotation pipeline metrics (completely separate from invoiced financials)
    const totalQuotations = quotations.length;
    const sentQuotations = quotations.filter((q) => q.status === 'Sent').length;
    const pendingApprovalCount = sentQuotations;
    const acceptedQuotations = quotations.filter((q) => q.status === 'Accepted').length;
    const convertedQuotations = quotations.filter((q) => q.status === 'Converted').length;
    const draftQuotationsCount = quotations.filter((q) => q.status === 'Draft').length;
    const activePipelineQuotations = quotations.filter(
      (q) => q.status === 'Sent' || q.status === 'Accepted'
    );
    const estimatedPipelineValue = round2(
      activePipelineQuotations.reduce((sum, q) => sum + (q.estimatedGrandTotal || 0), 0)
    );

    return sendSuccess(res, {
      totalInvoices,
      totalProjectValue,
      totalAmountReceived: totalInvoicedReceived,
      totalCashCollected,
      totalAdvances,
      outstandingAmount,
      paidInvoicesCount,
      pendingInvoicesCount,
      draftInvoicesCount,
      clientCount,
      quotationSummary: {
        totalQuotations,
        sentQuotations,
        pendingApprovalCount,
        acceptedQuotations,
        convertedQuotations,
        draftQuotationsCount,
        estimatedPipelineValue,
      },
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch dashboard summary', 500, (error as Error).message);
  }
}

export async function getDashboardAnalytics(req: Request, res: Response) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Generate 6-month historical revenue & collection data for charts
    const months: { label: string; year: number; month: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }

    const chartData = await Promise.all(
      months.map(async (m) => {
        const start = new Date(m.year, m.month, 1);
        const end = new Date(m.year, m.month + 1, 0, 23, 59, 59);

        const invoices = await Invoice.find({
          status: { $ne: 'Cancelled' },
          invoiceDate: { $gte: start, $lte: end },
        });

        const payments = await Payment.find({
          status: 'Completed',
          paymentDate: { $gte: start, $lte: end },
        });

        const billed = round2(invoices.reduce((acc, inv) => acc + inv.grandTotal, 0));
        const collected = round2(payments.reduce((acc, p) => acc + p.amount, 0));

        return {
          month: m.label,
          billed,
          collected,
        };
      })
    );

    // Payment method distribution
    const payments = await Payment.find({ status: 'Completed' });
    const methodTotals: Record<string, number> = {};
    payments.forEach((p) => {
      const method = p.paymentMethod || 'Other';
      methodTotals[method] = round2((methodTotals[method] || 0) + p.amount);
    });

    const paymentMethods = Object.keys(methodTotals).map((method) => ({
      name: method,
      value: methodTotals[method],
    }));

    return sendSuccess(res, {
      monthlyTrends: chartData,
      paymentMethods,
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch dashboard analytics', 500, (error as Error).message);
  }
}

export async function getRecentActivity(req: Request, res: Response) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const [recentInvoices, recentPayments, recentClients] = await Promise.all([
      Invoice.find().sort({ createdAt: -1 }).limit(5).select('invoiceNumber projectName grandTotal status invoiceDate clientSnapshot'),
      Payment.find({ status: 'Completed' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('clientId', 'clientName')
        .populate('invoiceId', 'invoiceNumber'),
      Client.find({ isArchived: false }).sort({ createdAt: -1 }).limit(5).select('clientName phone city createdAt'),
    ]);

    return sendSuccess(res, {
      recentInvoices,
      recentPayments,
      recentClients,
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch recent activity', 500, (error as Error).message);
  }
}

