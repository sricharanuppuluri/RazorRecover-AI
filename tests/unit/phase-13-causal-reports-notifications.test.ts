import assert from 'node:assert';
import { test, beforeEach, describe } from 'node:test';
import express, { Express } from 'express';
import request from 'supertest';
import apiRouter from '../../apps/api/src/routes';
import { NotificationRepository } from '../../apps/api/src/repositories/notification.repository';
import { ScheduledReportRepository } from '../../apps/api/src/repositories/scheduled-report.repository';
import { RecoveryCaseRepository } from '../../apps/api/src/repositories/recovery-case.repository';
import { CustomerRepository } from '../../apps/api/src/repositories/customer.repository';
import { AuditEventRepository } from '../../apps/api/src/repositories/audit-event.repository';

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  return app;
}

const app = createTestApp();
const TENANT_A = 'merchant_tenant_a';
const TENANT_B = 'merchant_tenant_b';

const notificationRepo = new NotificationRepository();
const reportRepo = new ScheduledReportRepository();
const caseRepo = new RecoveryCaseRepository();
const customerRepo = new CustomerRepository();
const auditRepo = new AuditEventRepository();

describe('Phase 13 — Multi-Channel Notifications, Causal Impact & Scheduled Reports Test Suite', () => {
  beforeEach(async () => {
    await notificationRepo.clear();
    await reportRepo.clear();
    await caseRepo.clear();
    await auditRepo.clear();

    // Create baseline recovery case for Tenant A
    await caseRepo.create({
      id: 'rc_p13_01',
      merchant_id: TENANT_A,
      order_id: 'ord_p13_01',
      payment_id: 'pay_p13_01',
      case_type: 'FAILED_PAYMENT',
      amount_at_risk: 500000, // ₹5,000 in paise
      recoverability_score: 0.85,
      expected_recovery_value: 425000,
      diagnosis: 'temporary_bank_degradation',
      diagnosis_confidence: 0.9,
      recommended_action: 'OFFER_ALTERNATE_PAYMENT',
      action_confidence: 0.85,
      policy_decision: 'ALLOWED',
      status: 'NEW',
      retry_count: 0,
      notification_count: 0,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });

    // Create active customer with opt-in
    await customerRepo.create({
      id: 'ord_p13_01',
      merchant_id: TENANT_A,
      external_customer_id: 'ext_cust_01',
      email_hash: 'hash_email',
      phone_hash: 'hash_phone',
      first_seen_at: new Date().toISOString(),
      successful_payment_count: 3,
      failed_payment_count: 1,
      total_success_value: 1500000,
      total_failed_value: 500000,
      contact_opt_in: true,
      risk_flags: [],
    });
  });

  describe('1. Multi-Channel Notification Gateway', () => {
    test('Tenant A can dispatch WHATSAPP notification', async () => {
      const res = await request(app)
        .post('/api/notifications/dispatch')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN')
        .send({
          recoveryCaseId: 'rc_p13_01',
          channel: 'WHATSAPP',
          templateName: 'PAYMENT_RETRY_LINK',
          language: 'HINGLISH',
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.merchantId, TENANT_A);
      assert.strictEqual(res.body.data.channel, 'WHATSAPP');
      assert.strictEqual(res.body.data.status, 'DELIVERED');
    });

    test('Customer contact opt-out blocks notification dispatch', async () => {
      // Opt out customer
      await customerRepo.create({
        id: 'ord_optout_01',
        merchant_id: TENANT_A,
        external_customer_id: 'ext_cust_optout',
        email_hash: 'hash_optout',
        phone_hash: 'hash_optout',
        first_seen_at: new Date().toISOString(),
        successful_payment_count: 0,
        failed_payment_count: 1,
        total_success_value: 0,
        total_failed_value: 500000,
        contact_opt_in: false,
        risk_flags: [],
      });

      await caseRepo.create({
        id: 'rc_optout_01',
        merchant_id: TENANT_A,
        order_id: 'ord_optout_01',
        payment_id: 'pay_optout_01',
        case_type: 'FAILED_PAYMENT',
        amount_at_risk: 500000,
        recoverability_score: 0.8,
        expected_recovery_value: 400000,
        diagnosis: 'customer_authentication_issue',
        diagnosis_confidence: 0.8,
        recommended_action: 'SEND_RECOVERY_LINK',
        action_confidence: 0.8,
        policy_decision: 'ALLOWED',
        status: 'NEW',
        retry_count: 0,
        notification_count: 0,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });

      const res = await request(app)
        .post('/api/notifications/dispatch')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN')
        .send({
          recoveryCaseId: 'rc_optout_01',
          channel: 'SMS',
          templateName: 'PAYMENT_REMINDER',
        });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.message.includes('opt-in is false'));
    });

    test('Tenant B CANNOT access Tenant A notification history (Tenant Isolation)', async () => {
      await notificationRepo.create({
        id: 'nd_a_01',
        merchantId: TENANT_A,
        recoveryCaseId: 'rc_p13_01',
        customerId: 'cust_01',
        channel: 'EMAIL',
        recipient: 'test@example.com',
        templateName: 'PAYMENT_LINK',
        language: 'ENGLISH',
        status: 'DELIVERED',
        sentAt: new Date().toISOString(),
      });

      const res = await request(app)
        .get('/api/notifications/history')
        .set('x-merchant-id', TENANT_B)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.length, 0); // Tenant B sees 0 dispatches
    });

    test('VIEWER role CANNOT dispatch notifications (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/notifications/dispatch')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'VIEWER')
        .send({
          recoveryCaseId: 'rc_p13_01',
          channel: 'SMS',
          templateName: 'RETRY_LINK',
        });

      assert.strictEqual(res.status, 403);
    });
  });

  describe('2. Causal Impact & Counterfactual Analysis', () => {
    test('Calculates causal metrics and counterfactual uplift', async () => {
      const res = await request(app)
        .get('/api/causal-analysis/metrics')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.merchantId, TENANT_A);
      assert.ok(typeof res.body.data.incrementalRevenueRecovered === 'number');
      assert.ok(typeof res.body.data.averageTreatmentEffect === 'number');
      assert.ok(Array.isArray(res.body.data.confidenceInterval95));
    });

    test('Retrieves counterfactual propensity matching details', async () => {
      const res = await request(app)
        .get('/api/causal-analysis/counterfactual')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.matchingMethod.includes('Propensity Score Matching'));
      assert.ok(res.body.data.covariatesMatched.length > 0);
    });
  });

  describe('3. Scheduled Operational Reports', () => {
    test('Creates report subscription and generates payload on-demand', async () => {
      const createRes = await request(app)
        .post('/api/reports/subscriptions')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN')
        .send({
          title: 'Executive Daily Recovery Summary',
          cadence: 'DAILY',
          recipients: ['finance@merchant.com'],
          format: 'PDF',
        });

      assert.strictEqual(createRes.status, 201);
      const reportId = createRes.body.data.id;

      const genRes = await request(app)
        .post(`/api/reports/subscriptions/${reportId}/generate`)
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(genRes.status, 200);
      assert.strictEqual(genRes.body.status, 'success');
      assert.ok(genRes.body.data.summaryPayload.includes('RAZORRECOVER AI - OPERATIONAL RECOVERY REPORT'));
    });

    test('Tenant B CANNOT access Tenant A scheduled reports (Tenant Isolation)', async () => {
      const res = await request(app)
        .get('/api/reports/subscriptions')
        .set('x-merchant-id', TENANT_B)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.length, 0);
    });
  });
});
