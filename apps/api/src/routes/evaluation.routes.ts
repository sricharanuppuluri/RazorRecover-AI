import { Router } from 'express';
import { getEvaluationSummaryController } from '../controllers/evaluation.controller';

const router = Router();

router.get('/summary', getEvaluationSummaryController);

export default router;
