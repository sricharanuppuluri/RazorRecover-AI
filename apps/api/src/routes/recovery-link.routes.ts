import { Router } from 'express';
import { resolveRecoveryLinkController } from '../controllers/recovery-action.controller';

const router = Router();

router.get('/:token', resolveRecoveryLinkController);

export default router;
