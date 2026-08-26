import { Router } from 'express';
import { runSimulationController } from '../controllers/simulation.controller';

const router = Router();

router.post('/run', runSimulationController);

export default router;
