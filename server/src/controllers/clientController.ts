import { Request, Response } from 'express';
import { Client } from '../models/Client.js';
import { Invoice } from '../models/Invoice.js';
import { Quotation } from '../models/Quotation.js';
import { Payment } from '../models/Payment.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';
import { round2 } from '../services/calculationService.js';

export async function getClients(req: Request, res: Response) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const { search, archived } = req.query;

    const filter: any = {};
    if (archived === 'true') {
      filter.isArchived = true;
    } else {
      filter.isArchived = false;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { clientName: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { gstin: searchRegex },
        { city: searchRegex },
      ];
    }

    const clients = await Client.find(filter).sort({ createdAt: -1 });

    // Aggregate billing summary for each client
    const clientIds = clients.map((c) => c._id);

    const [invoices, quotations] = await Promise.all([
      Invoice.find({
        clientId: { $in: clientIds },
        status: { $ne: 'Cancelled' },
      }),
      Quotation.find({
        clientId: { $in: clientIds },
      }).select('clientId'),
    ]);

    const quotationCountMap: Record<string, number> = {};
    quotations.forEach((q) => {
      const cid = q.clientId.toString();
      quotationCountMap[cid] = (quotationCountMap[cid] || 0) + 1;
    });

    const clientStats: Record<string, { totalBilled: number; totalPaid: number; invoiceCount: number; outstanding: number }> = {};

    clientIds.forEach((id) => {
      clientStats[id.toString()] = { totalBilled: 0, totalPaid: 0, invoiceCount: 0, outstanding: 0 };
    });

    invoices.forEach((inv) => {
      const cid = inv.clientId.toString();
      if (clientStats[cid]) {
        clientStats[cid].totalBilled += inv.grandTotal;
        clientStats[cid].invoiceCount += 1;
        clientStats[cid].totalPaid += (inv.amountReceivedSnapshot || 0);
        clientStats[cid].outstanding += (inv.balanceDueSnapshot ?? Math.max(0, inv.grandTotal - (inv.amountReceivedSnapshot || 0)));
      }
    });

    const formattedClients = clients.map((c) => {
      const stats = clientStats[c._id.toString()] || { totalBilled: 0, totalPaid: 0, invoiceCount: 0, outstanding: 0 };
      return {
        ...c.toObject(),
        invoiceCount: stats.invoiceCount,
        quotationCount: quotationCountMap[c._id.toString()] || 0,
        totalBilled: round2(stats.totalBilled),
        totalPaid: round2(stats.totalPaid),
        outstandingBalance: round2(stats.outstanding),
      };
    });

    return sendSuccess(res, formattedClients);
  } catch (error) {
    return sendError(res, 'Failed to fetch clients', 500, (error as Error).message);
  }
}

export async function createClient(req: AuthenticatedRequest, res: Response) {
  try {
    const { clientName, contactPerson, phone, email, billingAddress, city, state, pincode, gstin } = req.body;

    // Check duplicate phone
    const existing = await Client.findOne({ phone: phone.trim(), isArchived: false });
    if (existing) {
      return sendError(res, `A client with phone number ${phone} already exists.`, 409);
    }

    const client = await Client.create({
      clientName: clientName.trim(),
      contactPerson: contactPerson?.trim() || '',
      phone: phone.trim(),
      email: email?.trim().toLowerCase() || '',
      billingAddress: billingAddress.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      gstin: gstin?.trim().toUpperCase() || '',
    });

    await logAudit({
      action: 'CLIENT_CREATED',
      entityType: 'Client',
      entityId: client._id.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
      details: { clientName: client.clientName, phone: client.phone },
    });

    return sendSuccess(res, client, 'Client added successfully', 201);
  } catch (error) {
    return sendError(res, 'Failed to create client', 500, (error as Error).message);
  }
}

export async function getClientById(req: Request, res: Response) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const client = await Client.findById(req.params.id);
    if (!client) {
      return sendError(res, 'Client not found', 404);
    }

    const [invoices, quotations, payments] = await Promise.all([
      Invoice.find({ clientId: client._id }).sort({ invoiceDate: -1 }),
      Quotation.find({ clientId: client._id }).sort({ quotationDate: -1, createdAt: -1 }),
      Payment.find({ clientId: client._id, status: 'Completed' }).sort({ createdAt: -1, paymentDate: -1 }),
    ]);

    const activeInvoices = invoices.filter((i) => i.status !== 'Draft' && i.status !== 'Cancelled');
    const totalBilled = round2(activeInvoices.reduce((acc, i) => acc + i.grandTotal, 0));
    const totalPaid = round2(payments.reduce((acc, p) => acc + p.amount, 0));

    // Calculate actual unpaid invoice balance across all active projects for this client
    const outstandingBalance = round2(
      activeInvoices.reduce((acc, i) => {
        const due = typeof i.balanceDueSnapshot === 'number'
          ? i.balanceDueSnapshot
          : Math.max(0, i.grandTotal - (i.amountReceivedSnapshot || 0));
        return acc + Math.max(0, due);
      }, 0)
    );

    return sendSuccess(res, {
      ...client.toObject(),
      stats: {
        totalBilled: round2(totalBilled),
        totalPaid: round2(totalPaid),
        outstandingBalance,
        invoiceCount: invoices.length,
        quotationCount: quotations.length,
      },
      invoices,
      quotations,
      payments,
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch client details', 500, (error as Error).message);
  }
}

export async function updateClient(req: AuthenticatedRequest, res: Response) {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!client) {
      return sendError(res, 'Client not found', 404);
    }

    // Synchronize clientSnapshot across all invoices for this client so phone, address & name stay consistent
    const updatedSnapshot = {
      clientName: client.clientName,
      contactPerson: client.contactPerson || '',
      phone: client.phone,
      email: client.email || '',
      billingAddress: client.billingAddress,
      city: client.city,
      state: client.state,
      pincode: client.pincode,
      gstin: client.gstin || '',
    };

    await Invoice.updateMany(
      { clientId: client._id },
      { $set: { clientSnapshot: updatedSnapshot } }
    );

    await logAudit({
      action: 'CLIENT_UPDATED',
      entityType: 'Client',
      entityId: client._id.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
      details: { clientName: client.clientName, phone: client.phone },
    });

    return sendSuccess(res, client, 'Client updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update client', 500, (error as Error).message);
  }
}

export async function deleteClient(req: AuthenticatedRequest, res: Response) {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return sendError(res, 'Client not found', 404);
    }

    // Check if client has non-cancelled invoices
    const activeInvoices = await Invoice.countDocuments({
      clientId: client._id,
      status: { $ne: 'Cancelled' },
    });

    if (activeInvoices > 0) {
      // Soft-archive instead of hard-delete to protect data integrity
      client.isArchived = true;
      await client.save();

      await logAudit({
        action: 'CLIENT_ARCHIVED',
        entityType: 'Client',
        entityId: client._id.toString(),
        userId: req.user?.id,
        userName: req.user?.name,
        details: { reason: 'Has active invoices, archived client safely' },
      });

      return sendSuccess(res, client, 'Client has existing invoices so it was safely archived instead of deleted.');
    }

    await Client.findByIdAndDelete(req.params.id);

    await logAudit({
      action: 'CLIENT_DELETED',
      entityType: 'Client',
      entityId: String(req.params.id),
      userId: req.user?.id,
      userName: req.user?.name,
    });

    return sendSuccess(res, null, 'Client removed successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete client', 500, (error as Error).message);
  }
}
