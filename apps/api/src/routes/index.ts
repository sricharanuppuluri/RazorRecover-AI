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
import dashboardRoutes from './dashboard.routes';
import analyticsRoutes from './analytics.routes';
import evaluationRoutes from './evaluation.routes';
import simulationRoutes from './simulation.routes';
import auditRoutes from './audit.routes';
import merchantSettingsRoutes from './merchant-settings.routes';

const router = Router();

// Health check endpoint
router.use('/health', healthRoutes);

// Config endpoint
router.use('/config', configRoutes);

// Webhook endpoint
router.use('/webhooks', webhookRoutes);

// Dashboard & Merchant UI Endpoints (Phase 8)
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/evaluation', evaluationRoutes);
router.use('/simulations', simulationRoutes);
router.use('/audit', auditRoutes);
router.use('/merchant', merchantSettingsRoutes);

// Core Data Layer Persistence Endpoints
router.use('/merchants', merchantRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/recovery-cases', recoveryCaseRoutes);
router.use('/recovery-links', recoveryLinkRoutes);

export default router;
