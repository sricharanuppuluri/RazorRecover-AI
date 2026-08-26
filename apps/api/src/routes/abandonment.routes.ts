import { Router } from 'express';
import { AbandonmentController } from '../controllers/abandonment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';


const router = Router();

router.post('/sessions', authenticate, requireRole('ADMIN', 'OPERATOR', 'OWNER'), AbandonmentController.createSession);
router.post('/detect-and-recover', authenticate, requireRole('ADMIN', 'OPERATOR', 'OWNER'), AbandonmentController.detectAndRecover);
router.get('/sessions', authenticate, requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), AbandonmentController.listSessions);


export default router;
