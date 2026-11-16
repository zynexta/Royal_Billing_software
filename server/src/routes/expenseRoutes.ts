import { Router } from 'express';
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getClientProjects,
  getProjectExpensesSummary,
  getProjectExpenseDetails,
} from '../controllers/expenseController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createExpenseSchema, updateExpenseSchema } from '../validations/index.js';

const router = Router();

router.use(authenticate);

// Special routes before /:id parameter to avoid collision
router.get('/', getExpenses);
router.get('/projects', getProjectExpensesSummary);
router.get('/client-projects/:clientId', getClientProjects);
router.get('/project-details', getProjectExpenseDetails);

// Single item CRUD
router.get('/:id', getExpenseById);
router.post('/', validateBody(createExpenseSchema), createExpense);
router.put('/:id', validateBody(updateExpenseSchema), updateExpense);
router.delete('/:id', deleteExpense);

export default router;
