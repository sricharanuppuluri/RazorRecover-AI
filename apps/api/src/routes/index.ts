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
import promiseToPayRoutes from './promise-to-pay.routes';
import degradationRoutes from './degradation.routes';
import abandonmentRoutes from './abandonment.routes';
import subscriptionRoutes from './subscription.routes';
import experimentRoutes from './experiment.routes';
import calibrationRoutes from './calibration.routes';
import voiceRoutes from './voice.routes';
import notificationRoutes from './notification.routes';
import causalAnalysisRoutes from './causal-analysis.routes';
import scheduledReportRoutes from './scheduled-report.routes';
import auditComplianceRoutes from './audit-compliance.routes';
import systemSimulatorRoutes from './system-simulator.routes';

const router = Router();

// Health check endpoint
router.use('/health', healthRoutes);

// Config endpoint
router.use('/config', configRoutes);

// Webhook endpoint
router.use('/webhooks', webhookRoutes);

// Dashboard & Merchant UI Endpoints (Phase 8, 10, 11, 12, 13 & 14)
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/evaluation', evaluationRoutes);
router.use('/simulations', simulationRoutes);
router.use('/simulator', systemSimulatorRoutes);
router.use('/audit', auditRoutes);
router.use('/audit-vault', auditComplianceRoutes);
router.use('/merchant', merchantSettingsRoutes);
router.use('/promises', promiseToPayRoutes);
router.use('/degradation', degradationRoutes);
router.use('/abandonment', abandonmentRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/experiments', experimentRoutes);
router.use('/calibration', calibrationRoutes);
router.use('/voice', voiceRoutes);
router.use('/notifications', notificationRoutes);
router.use('/causal-analysis', causalAnalysisRoutes);
router.use('/reports', scheduledReportRoutes);


// Core Data Layer Persistence Endpoints
router.use('/merchants', merchantRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/recovery-cases', recoveryCaseRoutes);
router.use('/recovery-links', recoveryLinkRoutes);

export default router;


