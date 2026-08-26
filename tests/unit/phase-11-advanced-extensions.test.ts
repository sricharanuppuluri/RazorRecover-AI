import assert from 'node:assert';
import { test, beforeEach, describe } from 'node:test';
import express, { Express } from 'express';
import request from 'supertest';
import apiRouter from '../../apps/api/src/routes';
import { CheckoutSessionRepository } from '../../apps/api/src/repositories/checkout-session.repository';
import { SubscriptionRepository } from '../../apps/api/src/repositories/subscription.repository';
import { ExperimentRepository } from '../../apps/api/src/repositories/experiment.repository';
import { RecoveryCaseRepository } from '../../apps/api/src/repositories/recovery-case.repository';
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

const checkoutRepo = new CheckoutSessionRepository();
const subRepo = new SubscriptionRepository();
const expRepo = new ExperimentRepository();
const caseRepo = new RecoveryCaseRepository();
const auditRepo = new AuditEventRepository();

describe('Phase 11 — Advanced Recovery Extensions Test Suite', () => {
  beforeEach(async () => {
    await checkoutRepo.clear();
    await subRepo.clear();
    await expRepo.clear();
    await caseRepo.clear();
    await auditRepo.clear();
  });

  describe('1. Checkout Abandonment Recovery Module', () => {
    test('Tenant A can create a checkout session and retrieve it', async () => {
      const res = await request(app)
        .post('/api/abandonment/sessions')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN')
        .send({
          orderId: 'ord_ab_01',
          customerId: 'cust_ab_01',
          amount: 500000, // ₹5,000 in paise
          currency: 'INR',
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.merchantId, TENANT_A);
      assert.strictEqual(res.body.data.status, 'STARTED');
      assert.strictEqual(res.body.data.amount, 500000);
    });

    test('Detect and recover marks eligible sessions as ABANDONED and creates recovery cases', async () => {
      // Create session started in past
      await checkoutRepo.create({
        id: 'cs_old_01',
        merchantId: TENANT_A,
        orderId: 'ord_old_01',
        customerId: 'cust_old_01',
        amount: 750000,
        currency: 'INR',
        status: 'STARTED',
        startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
      });

      const res = await request(app)
        .post('/api/abandonment/detect-and-recover')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN')
        .send({ timeoutMinutes: 15 });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.detectedCount, 1);
      assert.strictEqual(res.body.data.recoveryCasesCreated.length, 1);

      const session = await checkoutRepo.findById('cs_old_01');
      assert.strictEqual(session?.status, 'ABANDONED');
      assert.ok(session?.recoveryCaseId);
    });

    test('Tenant B CANNOT access Tenant A checkout sessions (Tenant Isolation)', async () => {
      await checkoutRepo.create({
        id: 'cs_tenant_a_01',
        merchantId: TENANT_A,
        orderId: 'ord_a_01',
        customerId: 'cust_a_01',
        amount: 250000,
        currency: 'INR',
        status: 'STARTED',
        startedAt: new Date().toISOString(),
      });

      const res = await request(app)
        .get('/api/abandonment/sessions')
        .set('x-merchant-id', TENANT_B)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.length, 0); // Tenant B sees 0 sessions
    });

    test('VIEWER role CANNOT trigger abandonment detection (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/abandonment/detect-and-recover')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'VIEWER')
        .send({ timeoutMinutes: 15 });

      assert.strictEqual(res.status, 403);
    });
  });

  describe('2. Subscription Failure Recovery Module', () => {
    test('Record subscription failure initializes recovery case and schedules retry', async () => {
      const res = await request(app)
        .post('/api/subscriptions/failures')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'OPERATOR')
        .send({
          subscriptionId: 'sub_rec_01',
          customerId: 'cust_sub_01',
          amount: 149900, // ₹1,499 in paise
          planName: 'Pro Monthly',
          failureReason: 'INSUFFICIENT_FUNDS',
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.subscriptionFailure.merchantId, TENANT_A);
      assert.strictEqual(res.body.data.subscriptionFailure.status, 'FAILED');
      assert.ok(res.body.data.recoveryCaseId);
    });

    test('Tenant B CANNOT access Tenant A subscription failures (Tenant Isolation)', async () => {
      await subRepo.create({
        id: 'sub_a_01',
        merchantId: TENANT_A,
        subscriptionId: 'sub_a_rec',
        customerId: 'cust_a',
        amount: 99900,
        planName: 'Basic Plan',
        failureReason: 'MANDATE_EXPIRED',
        retryCount: 1,
        status: 'FAILED',
        lastAttemptAt: new Date().toISOString(),
      });

      const res = await request(app)
        .get('/api/subscriptions/failures')
        .set('x-merchant-id', TENANT_B)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.length, 0);
    });
  });

  describe('3. A/B Recovery Experimentation Engine', () => {
    test('Creates recovery experiment and computes analytics per variant', async () => {
      const res = await request(app)
        .post('/api/experiments')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN')
        .send({
          name: 'AI Agent vs Rule-Based Baseline',
          variants: [
            { name: 'AI Decision Engine', strategy: 'AI_AGENT', weight: 50 },
            { name: 'Rule Based', strategy: 'RULE_BASED', weight: 50 },
          ],
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.status, 'ACTIVE');

      const expId = res.body.data.id;

      // Populate recovery cases for analysis
      await caseRepo.create({
        id: 'rc_exp_01',
        merchant_id: TENANT_A,
        order_id: 'ord_01',
        payment_id: 'pay_01',
        case_type: 'FAILED_PAYMENT',
        amount_at_risk: 100000,
        recoverability_score: 0.9,
        expected_recovery_value: 90000,
        diagnosis: 'bank_degradation',
        diagnosis_confidence: 0.9,
        recommended_action: 'OFFER_ALTERNATE_PAYMENT',
        action_confidence: 0.9,
        policy_decision: 'ALLOWED',
        status: 'RECOVERED',
        retry_count: 1,
        notification_count: 1,
        started_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
        recovered_amount: 100000,
      });

      const analyticsRes = await request(app)
        .get(`/api/experiments/${expId}/analytics`)
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(analyticsRes.status, 200);
      assert.strictEqual(analyticsRes.body.data.merchantId, TENANT_A);
      assert.ok(analyticsRes.body.data.variantMetrics['AI Decision Engine']);
    });
  });

  describe('4. Model Calibration & Drift Tracking Module', () => {
    test('Calculates calibration metrics (ECE, Brier score) and detects drift alerts', async () => {
      // Create test cases with outcomes for calibration
      for (let i = 0; i < 6; i++) {
        await caseRepo.create({
          id: `rc_calib_${i}`,
          merchant_id: TENANT_A,
          order_id: `ord_${i}`,
          payment_id: `pay_${i}`,
          case_type: 'FAILED_PAYMENT',
          amount_at_risk: 100000,
          recoverability_score: 0.85,
          expected_recovery_value: 85000,
          diagnosis: 'bank_degradation',
          diagnosis_confidence: 0.60, // Low diagnosis confidence to trigger drift
          recommended_action: 'WAIT_AND_RETRY',
          action_confidence: 0.8,
          policy_decision: 'ALLOWED',
          status: i % 2 === 0 ? 'RECOVERED' : 'FAILED',
          retry_count: 1,
          notification_count: 1,
          started_at: new Date().toISOString(),
          expires_at: new Date().toISOString(),
          recovered_amount: i % 2 === 0 ? 100000 : 0,
        });
      }

      const metricsRes = await request(app)
        .get('/api/calibration/metrics')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(metricsRes.status, 200);
      assert.strictEqual(metricsRes.body.data.totalEvaluatedCases, 6);
      assert.ok(typeof metricsRes.body.data.expectedCalibrationError === 'number');

      const driftRes = await request(app)
        .get('/api/calibration/drift')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(driftRes.status, 200);
      assert.ok(Array.isArray(driftRes.body.data));
      assert.ok(driftRes.body.data.some((a: any) => a.metric === 'DIAGNOSIS_ACCURACY'));
    });
  });
});
