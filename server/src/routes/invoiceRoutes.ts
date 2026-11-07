import { Router } from 'express';
import {
  getInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  issueInvoice,
  cancelInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  downloadPDF,
  getWhatsAppShareText,
} from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createInvoiceSchema } from '../validations/index.js';

const router = Router();

// Public / client share link for PDF download & WhatsApp sharing if token provided or direct access
router.get('/:id/pdf', downloadPDF);
router.get('/:id/whatsapp', getWhatsAppShareText);

// Authenticated routes
router.use(authenticate);

router.get('/', getInvoices);
router.post('/', validateBody(createInvoiceSchema), createInvoice);
router.get('/:id', getInvoiceById);
router.put('/:id', updateInvoice);
router.post('/:id/issue', issueInvoice);
router.post('/:id/cancel', cancelInvoice);
router.patch('/:id/status', updateInvoiceStatus);
router.delete('/:id', deleteInvoice);

export default router;

