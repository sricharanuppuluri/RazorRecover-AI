import { Router } from 'express';
import healthRoutes from './health.routes';
import merchantRoutes from './merchant.routes';
import customerRoutes from './customer.routes';
import orderRoutes from './order.routes';
import paymentRoutes from './payment.routes';
import recoveryCaseRoutes from './recovery-case.routes';
import recoveryLinkRoutes from './recovery-link.routes';
import configRoutes from './config.routes';
import webhookRoutes from './webhook.routes';

const router = Router();

// Health check endpoint (also available under /api/health)
router.use('/health', healthRoutes);

// Config endpoint
router.use('/config', configRoutes);

// Webhook endpoint
router.use('/webhooks', webhookRoutes);

// Core Data Layer Persistence Verification Endpoints
router.use('/merchants', merchantRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/recovery-cases', recoveryCaseRoutes);
router.use('/recovery-links', recoveryLinkRoutes);

export default router;
