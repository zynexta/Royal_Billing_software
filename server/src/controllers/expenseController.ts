import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Expense } from '../models/Expense.js';
import { Client } from '../models/Client.js';
import { Invoice } from '../models/Invoice.js';
import { Quotation } from '../models/Quotation.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';
import { round2 } from '../services/calculationService.js';

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * GET /api/expenses
 * List expenses with filters, search, pagination, and high-level summaries
 */
export async function getExpenses(req: Request, res: Response) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const {
      search,
      clientId,
      project,
      projectName,
      category,
      paymentMethod,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    const filter: any = {};

    if (category && typeof category === 'string' && category !== 'All') {
      filter.category = category;
    }

    if (paymentMethod && typeof paymentMethod === 'string' && paymentMethod !== 'All') {
      filter.paymentMethod = paymentMethod;
    }

    if (clientId && typeof clientId === 'string' && clientId !== 'All') {
      filter.clientId = clientId;
    }

    const proj = project || projectName;
    if (proj && typeof proj === 'string' && proj !== 'All') {
      filter.projectName = proj;
    }

    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.expenseDate.$lte = end;
      }
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const sanitized = escapeRegex(search.trim());
      const searchRegex = new RegExp(sanitized, 'i');

      // Find matching clients first
      const matchingClients = await Client.find({
        $or: [
          { clientName: searchRegex },
          { phone: searchRegex },
          { city: searchRegex },
        ],
      }).select('_id');

      const clientIds = matchingClients.map((c) => c._id);

      filter.$or = [
        { description: searchRegex },
        { projectName: searchRegex },
        { projectLocation: searchRegex },
        { 'clientSnapshot.clientName': searchRegex },
        { clientId: { $in: clientIds } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 100;
    const skip = (pageNum - 1) * limitNum;

    const [expenses, totalMatching, allTimeExpenses] = await Promise.all([
      Expense.find(filter)
        .populate('clientId', 'clientName phone city billingAddress gstin')
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Expense.countDocuments(filter),
      // All time aggregation for overall metrics
      Expense.find({}),
    ]);

    // Calculate this month date boundaries
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const thisMonthExpenses = round2(
      allTimeExpenses
        .filter((e) => {
          const d = new Date(e.expenseDate);
          return d >= firstDayThisMonth && d <= lastDayThisMonth;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0)
    );

    const totalAllTimeAmount = round2(
      allTimeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    );

    const distinctProjectsCount = new Set(
      allTimeExpenses.map((e) => e.projectName?.trim().toLowerCase()).filter(Boolean)
    ).size;

    // Filtered total amount
    const filteredTotalAmount = round2(
      expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    );

    // Category breakdown across all expenses
    const categoryTotals: Record<string, number> = {};
    allTimeExpenses.forEach((e) => {
      const cat = e.category || 'Other';
      categoryTotals[cat] = round2((categoryTotals[cat] || 0) + (e.amount || 0));
    });

    return sendSuccess(res, {
      expenses,
      pagination: {
        total: totalMatching,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalMatching / limitNum) || 1,
      },
      summary: {
        totalExpenses: totalAllTimeAmount,
        thisMonthExpenses,
        projectsCount: distinctProjectsCount,
        totalEntries: allTimeExpenses.length,
        filteredTotal: filteredTotalAmount,
        categoryBreakdown: categoryTotals,
      },
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch expenses', 500, (error as Error).message);
  }
}

/**
 * GET /api/expenses/projects
 * List all projects with expense metrics and category breakdowns
 */
export async function getProjectExpensesSummary(req: Request, res: Response) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const expenses = await Expense.find({}).populate('clientId', 'clientName phone city');

    const projectMap: Record<
      string,
      {
        projectName: string;
        projectLocation?: string;
        clientId?: string;
        clientName: string;
        totalExpenses: number;
        expenseCount: number;
        categoryBreakdown: Record<string, number>;
        lastExpenseDate: Date;
      }
    > = {};

    expenses.forEach((e) => {
      const key = e.projectName?.trim() || 'Untitled Project';
      if (!projectMap[key]) {
        const clientObj = typeof e.clientId === 'object' && e.clientId ? (e.clientId as any) : null;
        projectMap[key] = {
          projectName: e.projectName,
          projectLocation: e.projectLocation,
          clientId: clientObj?._id?.toString() || e.clientId?.toString(),
          clientName: clientObj?.clientName || e.clientSnapshot?.clientName || 'Client',
          totalExpenses: 0,
          expenseCount: 0,
          categoryBreakdown: {},
          lastExpenseDate: e.expenseDate,
        };
      }

      projectMap[key].totalExpenses = round2(projectMap[key].totalExpenses + (e.amount || 0));
      projectMap[key].expenseCount += 1;
      const cat = e.category || 'Other';
      projectMap[key].categoryBreakdown[cat] = round2(
        (projectMap[key].categoryBreakdown[cat] || 0) + (e.amount || 0)
      );

      if (new Date(e.expenseDate) > new Date(projectMap[key].lastExpenseDate)) {
        projectMap[key].lastExpenseDate = e.expenseDate;
      }
    });

    const projectList = Object.values(projectMap).sort((a, b) => b.totalExpenses - a.totalExpenses);

    return sendSuccess(res, projectList);
  } catch (error) {
    return sendError(res, 'Failed to fetch project expenses', 500, (error as Error).message);
  }
}

/**
 * GET /api/expenses/client-projects/:clientId
 * Returns all distinct projects for a given client from Invoices, Quotations & Expenses
 */
export async function getClientProjects(req: Request, res: Response) {
  try {
    const clientId = String(req.params.clientId);

    if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
      return sendError(res, 'Valid client ID is required', 400);
    }

    const clientObjectId = new mongoose.Types.ObjectId(clientId);

    const [invoices, quotations, expenses] = await Promise.all([
      Invoice.find({ clientId: clientObjectId }).select('projectName projectLocation'),
      Quotation.find({ clientId: clientObjectId }).select('projectName projectLocation'),
      Expense.find({ clientId: clientObjectId }).select('projectName projectLocation'),
    ]);

    const projectMap = new Map<string, { projectName: string; projectLocation?: string }>();

    const addProj = (item: { projectName?: string; projectLocation?: string }) => {
      const name = item.projectName?.trim();
      if (name && !projectMap.has(name.toLowerCase())) {
        projectMap.set(name.toLowerCase(), {
          projectName: name,
          projectLocation: item.projectLocation?.trim() || undefined,
        });
      }
    };

    invoices.forEach(addProj);
    quotations.forEach(addProj);
    expenses.forEach(addProj);

    const projectList = Array.from(projectMap.values());

    return sendSuccess(res, projectList);
  } catch (error) {
    return sendError(res, 'Failed to fetch client projects', 500, (error as Error).message);
  }
}

/**
 * GET /api/expenses/project-details
 * Detailed breakdown for a specific project
 */
export async function getProjectExpenseDetails(req: Request, res: Response) {
  try {
    const { projectName, clientId } = req.query;

    if (!projectName || typeof projectName !== 'string') {
      return sendError(res, 'Project name is required', 400);
    }

    const query: any = { projectName: projectName.trim() };
    if (clientId && typeof clientId === 'string') {
      query.clientId = clientId;
    }

    const expenses = await Expense.find(query)
      .populate('clientId', 'clientName phone city')
      .sort({ expenseDate: -1 });

    const totalProjectExpenses = round2(
      expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    );

    const categoryBreakdown: Record<string, { total: number; count: number }> = {};
    expenses.forEach((e) => {
      const cat = e.category || 'Other';
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { total: 0, count: 0 };
      }
      categoryBreakdown[cat].total = round2(categoryBreakdown[cat].total + (e.amount || 0));
      categoryBreakdown[cat].count += 1;
    });

    const clientObj = expenses[0] && typeof expenses[0].clientId === 'object'
      ? (expenses[0].clientId as any)
      : null;

    return sendSuccess(res, {
      projectName: projectName.trim(),
      projectLocation: expenses[0]?.projectLocation || '',
      client: clientObj || expenses[0]?.clientSnapshot || null,
      totalExpenses: totalProjectExpenses,
      expenseCount: expenses.length,
      categoryBreakdown,
      expenses,
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch project details', 500, (error as Error).message);
  }
}

/**
 * GET /api/expenses/:id
 */
export async function getExpenseById(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const expense = await Expense.findById(id).populate('clientId');
    if (!expense) {
      return sendError(res, 'Expense not found', 404);
    }
    return sendSuccess(res, expense);
  } catch (error) {
    return sendError(res, 'Failed to fetch expense', 500, (error as Error).message);
  }
}

/**
 * POST /api/expenses
 */
export async function createExpense(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      clientId,
      projectName,
      projectLocation,
      category,
      description,
      amount,
      expenseDate,
      paymentMethod,
      notes,
      receiptUrl,
    } = req.body;

    const client = await Client.findById(clientId);
    if (!client) {
      return sendError(res, 'Client not found', 404);
    }

    const expense = await Expense.create({
      clientId: client._id,
      clientSnapshot: {
        clientName: client.clientName,
        phone: client.phone,
        city: client.city,
      },
      projectName: projectName.trim(),
      projectLocation: projectLocation?.trim() || '',
      category,
      description: description.trim(),
      amount: round2(Number(amount)),
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      paymentMethod: paymentMethod || 'Cash',
      notes: notes?.trim() || '',
      receiptUrl: receiptUrl?.trim() || '',
    });

    await logAudit({
      action: 'EXPENSE_RECORDED',
      entityType: 'Expense',
      entityId: expense._id.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
      details: {
        projectName: expense.projectName,
        category: expense.category,
        amount: expense.amount,
        clientName: client.clientName,
      },
    });

    const populated = await Expense.findById(expense._id).populate('clientId');

    return sendSuccess(res, populated, 'Expense recorded successfully', 201);
  } catch (error) {
    return sendError(res, 'Failed to create expense', 500, (error as Error).message);
  }
}

/**
 * GET /api/expenses/categories
 * Returns default categories merged with recorded custom categories
 */
export async function getExpenseCategories(req: Request, res: Response) {
  try {
    const DEFAULT_CATEGORIES = [
      'Labour Charges',
      'Material Purchase',
      'Transportation',
      'Equipment Rental',
      'Food & Accommodation',
      'Other',
    ];

    const recordedCategories = await Expense.distinct('category');
    const combinedSet = new Set<string>(DEFAULT_CATEGORIES);
    recordedCategories.forEach((cat) => {
      if (cat && typeof cat === 'string' && cat.trim()) {
        combinedSet.add(cat.trim());
      }
    });

    return sendSuccess(res, Array.from(combinedSet));
  } catch (error) {
    return sendError(res, 'Failed to fetch categories', 500, (error as Error).message);
  }
}

/**
 * POST /api/expenses/batch
 * Record multiple project expenses in a single submission
 */
export async function createBatchExpenses(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      clientId,
      projectName,
      projectLocation,
      defaultDate,
      defaultPaymentMethod,
      items,
    } = req.body;

    const client = await Client.findById(clientId);
    if (!client) {
      return sendError(res, 'Client not found', 404);
    }

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'At least one expense item is required', 400);
    }

    const docsToInsert = items.map((item: any) => {
      const dateVal = item.expenseDate || defaultDate;
      return {
        clientId: client._id,
        clientSnapshot: {
          clientName: client.clientName,
          phone: client.phone,
          city: client.city,
        },
        projectName: projectName.trim(),
        projectLocation: projectLocation?.trim() || '',
        category: (item.category || 'Other').trim(),
        description: item.description.trim(),
        amount: round2(Number(item.amount)),
        expenseDate: dateVal ? new Date(dateVal) : new Date(),
        paymentMethod: item.paymentMethod || defaultPaymentMethod || 'Cash',
        notes: item.notes?.trim() || '',
        receiptUrl: item.receiptUrl?.trim() || '',
      };
    });

    const createdExpenses = await Expense.insertMany(docsToInsert);

    const totalBatchAmount = round2(
      docsToInsert.reduce((sum, d) => sum + d.amount, 0)
    );

    await logAudit({
      action: 'BATCH_EXPENSES_RECORDED',
      entityType: 'Expense',
      entityId: createdExpenses[0]?._id?.toString(),
      userId: req.user?.id,
      userName: req.user?.name,
      details: {
        projectName: projectName.trim(),
        clientName: client.clientName,
        itemCount: createdExpenses.length,
        totalAmount: totalBatchAmount,
      },
    });

    return sendSuccess(
      res,
      {
        count: createdExpenses.length,
        totalAmount: totalBatchAmount,
        expenses: createdExpenses,
      },
      `${createdExpenses.length} expenses recorded successfully`,
      201
    );
  } catch (error) {
    return sendError(res, 'Failed to record batch expenses', 500, (error as Error).message);
  }
}

/**
 * PUT /api/expenses/:id
 */
export async function updateExpense(req: AuthenticatedRequest, res: Response) {
  try {
    const id = String(req.params.id);
    const expense = await Expense.findById(id);
    if (!expense) {
      return sendError(res, 'Expense not found', 404);
    }

    const {
      clientId,
      projectName,
      projectLocation,
      category,
      description,
      amount,
      expenseDate,
      paymentMethod,
      notes,
      receiptUrl,
    } = req.body;

    if (clientId && clientId !== expense.clientId.toString()) {
      const client = await Client.findById(clientId);
      if (client) {
        expense.clientId = client._id;
        expense.clientSnapshot = {
          clientName: client.clientName,
          phone: client.phone,
          city: client.city,
        };
      }
    }

    if (projectName) expense.projectName = projectName.trim();
    if (projectLocation !== undefined) expense.projectLocation = projectLocation.trim();
    if (category) expense.category = category;
    if (description) expense.description = description.trim();
    if (amount !== undefined) expense.amount = round2(Number(amount));
    if (expenseDate) expense.expenseDate = new Date(expenseDate);
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (notes !== undefined) expense.notes = notes.trim();
    if (receiptUrl !== undefined) expense.receiptUrl = receiptUrl.trim();

    await expense.save();

    await logAudit({
      action: 'EXPENSE_UPDATED',
      entityType: 'Expense',
      entityId: id,
      userId: req.user?.id,
      userName: req.user?.name,
      details: {
        projectName: expense.projectName,
        category: expense.category,
        amount: expense.amount,
      },
    });

    const populated = await Expense.findById(expense._id).populate('clientId');

    return sendSuccess(res, populated, 'Expense updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update expense', 500, (error as Error).message);
  }
}

/**
 * DELETE /api/expenses/:id
 */
export async function deleteExpense(req: AuthenticatedRequest, res: Response) {
  try {
    const id = String(req.params.id);
    const expense = await Expense.findById(id);
    if (!expense) {
      return sendError(res, 'Expense not found', 404);
    }

    await Expense.findByIdAndDelete(id);

    await logAudit({
      action: 'EXPENSE_DELETED',
      entityType: 'Expense',
      entityId: id,
      userId: req.user?.id,
      userName: req.user?.name,
      details: {
        projectName: expense.projectName,
        amount: expense.amount,
      },
    });

    return sendSuccess(res, { id }, 'Expense deleted successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete expense', 500, (error as Error).message);
  }
}
