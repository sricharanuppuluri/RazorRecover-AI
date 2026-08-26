import { Router } from 'express';
import { PromiseToPayController } from '../controllers/promise-to-pay.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();
const controller = new PromiseToPayController();

router.use(authenticate);

router.get('/', requireRole('VIEWER'), controller.listPromises);
router.post('/', requireRole('OPERATOR'), controller.createPromise);
router.put('/:id/status', requireRole('OPERATOR'), controller.updateStatus);

export default router;
