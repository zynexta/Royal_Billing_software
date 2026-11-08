import { Router } from 'express';
import {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  issueQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  convertToInvoice,
  downloadQuotationPDF,
  getQuotationWhatsAppShare,
  deleteQuotation,
} from '../controllers/quotationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public / client share link for PDF download & WhatsApp sharing
router.get('/:id/pdf', downloadQuotationPDF);
router.get('/:id/whatsapp', getQuotationWhatsAppShare);

// Authenticated routes
router.use(authenticate);

router.get('/', getQuotations);
router.post('/', createQuotation);
router.get('/:id', getQuotationById);
router.put('/:id', updateQuotation);
router.post('/:id/issue', issueQuotation);
router.post('/:id/send', sendQuotation);
router.post('/:id/accept', acceptQuotation);
router.post('/:id/reject', rejectQuotation);
router.post('/:id/convert-to-invoice', convertToInvoice);
router.delete('/:id', deleteQuotation);

export default router;
