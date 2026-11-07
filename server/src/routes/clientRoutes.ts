import { Router } from 'express';
import {
  getClients,
  createClient,
  getClientById,
  updateClient,
  deleteClient,
} from '../controllers/clientController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { clientSchema } from '../validations/index.js';

const router = Router();

router.use(authenticate);

router.get('/', getClients);
router.post('/', validateBody(clientSchema), createClient);
router.get('/:id', getClientById);
router.put('/:id', validateBody(clientSchema), updateClient);
router.delete('/:id', deleteClient);

export default router;

