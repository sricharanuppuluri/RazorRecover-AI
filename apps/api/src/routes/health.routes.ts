import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();
const healthController = new HealthController();

// GET /health and GET /api/health
router.get('/', healthController.getHealth);

export default router;
