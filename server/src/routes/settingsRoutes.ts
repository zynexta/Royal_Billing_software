import { Router } from 'express';
import {
  getSettings,
  updateCompanyProfile,
  updateInvoiceSettings,
  updateQuotationSettings,
  updateGSTSettings,
  updateBankDetails,
} from '../controllers/settingsController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.put('/company', updateCompanyProfile);
router.put('/invoice', updateInvoiceSettings);
router.put('/quotation', updateQuotationSettings);
router.put('/gst', updateGSTSettings);
router.put('/bank', updateBankDetails);

export default router;

