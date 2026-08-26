import { Router } from 'express';
import healthRoutes from './health.routes';
import merchantRoutes from './merchant.routes';
import customerRoutes from './customer.routes';
import orderRoutes from './order.routes';
import paymentRoutes from './payment.routes';
import recoveryCaseRoutes from './recovery-case.routes';
import configRoutes from './config.routes';

const router = Router();

// Health check endpoint (also available under /api/health)
router.use('/health', healthRoutes);

// Config endpoint
router.use('/config', configRoutes);

// Core Data Layer Persistence Verification Endpoints
router.use('/merchants', merchantRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/recovery-cases', recoveryCaseRoutes);

export default router;
