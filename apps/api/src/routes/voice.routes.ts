import { Router } from 'express';
import { VoiceController } from '../controllers/voice.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.post('/calls', authenticate, requireRole('ADMIN', 'OPERATOR', 'OWNER'), VoiceController.initiateCall);
router.post('/calls/:sessionId/interact', authenticate, requireRole('ADMIN', 'OPERATOR', 'OWNER'), VoiceController.interact);
router.get('/calls/:sessionId', authenticate, requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), VoiceController.getSession);
router.get('/calls', authenticate, requireRole('ADMIN', 'OPERATOR', 'OWNER', 'VIEWER'), VoiceController.listSessions);

export default router;
