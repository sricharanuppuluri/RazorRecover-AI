import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { createApp } from '../../apps/api/src/app';
import { PromiseToPayRepository } from '../../apps/api/src/repositories/promise-to-pay.repository';
import { PaymentRepository } from '../../apps/api/src/repositories/payment.repository';
import { RecoveryCaseRepository } from '../../apps/api/src/repositories/recovery-case.repository';
import { AuditEventRepository } from '../../apps/api/src/repositories/audit-event.repository';
import { DegradationService } from '../../apps/api/src/services/degradation.service';
import { NotificationMessageService } from '../../apps/api/src/services/notification-message.service';

const app = createApp();
const request = supertest(app);

test('Phase 10 — Advanced Features, Degradation, Receivables & Export Test Suite', async (t) => {
  const promiseRepo = new PromiseToPayRepository();
  const paymentRepo = new PaymentRepository();
  const caseRepo = new RecoveryCaseRepository();
  const auditRepo = new AuditEventRepository();
  const degradationService = new DegradationService();
  const notificationService = new NotificationMessageService();

  const tenantAHeaders = {
    'x-merchant-id': 'merch_tenant_a',
    'x-user-role': 'ADMIN',
    'x-user-id': 'user_admin_a',
  };

  const tenantBHeaders = {
    'x-merchant-id': 'merch_tenant_b',
    'x-user-role': 'ADMIN',
    'x-user-id': 'user_admin_b',
  };

  const viewerHeaders = {
    'x-merchant-id': 'merch_tenant_a',
    'x-user-role': 'VIEWER',
    'x-user-id': 'user_viewer_a',
  };

  t.beforeEach(async () => {
    await promiseRepo.clear();
    await paymentRepo.clear();

    // Setup initial case for Tenant A
    await caseRepo.create({
      id: 'rc_tenant_a_p10',
      merchant_id: 'merch_tenant_a',
      order_id: 'ord_p10_a',
      payment_id: 'pay_p10_a',
      case_type: 'FAILED_PAYMENT',
      amount_at_risk: 750000, // ₹7,500.00
      recoverability_score: 0.85,
      expected_recovery_value: 637500,
      diagnosis: 'temporary_bank_degradation',
      diagnosis_confidence: 0.9,
      recommended_action: 'OFFER_ALTERNATE_PAYMENT',
      action_confidence: 0.88,
      policy_decision: 'ALLOWED',
      status: 'NEW',
      retry_count: 0,
      notification_count: 0,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
  });

  await t.test('1. PromiseToPay: Creates pending commitment with integer paise math and audit log', async () => {
    const res = await request
      .post('/api/promises')
      .set(tenantAHeaders)
      .send({
        recoveryCaseId: 'rc_tenant_a_p10',
        promisedAmount: 750000,
        promisedDate: '2026-08-30T10:00:00Z',
        notes: 'Customer agreed to retry via UPI on payday',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.merchantId, 'merch_tenant_a');
    assert.equal(res.body.data.promisedAmount, 750000);
    assert.equal(res.body.data.status, 'PENDING');

    const auditEvents = await auditRepo.listByMerchant('merch_tenant_a');
    const createdEvent = auditEvents.find((e) => e.event_type === 'PROMISE_TO_PAY_CREATED');
    assert.ok(createdEvent);
    assert.equal(createdEvent.recovery_case_id, 'rc_tenant_a_p10');
  });

  await t.test('2. PromiseToPay: Updates promise status to KEPT or BROKEN', async () => {
    const createRes = await request
      .post('/api/promises')
      .set(tenantAHeaders)
      .send({
        recoveryCaseId: 'rc_tenant_a_p10',
        promisedAmount: 750000,
        promisedDate: '2026-08-30T10:00:00Z',
      });

    const promiseId = createRes.body.data.id;

    const updateRes = await request
      .put(`/api/promises/${promiseId}/status`)
      .set(tenantAHeaders)
      .send({ status: 'KEPT' });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.status, 'KEPT');
  });

  await t.test('3. PromiseToPay: Tenant B CANNOT update or view Tenant A promises (BOLA/IDOR protection)', async () => {
    const createRes = await request
      .post('/api/promises')
      .set(tenantAHeaders)
      .send({
        recoveryCaseId: 'rc_tenant_a_p10',
        promisedAmount: 750000,
        promisedDate: '2026-08-30T10:00:00Z',
      });

    const promiseId = createRes.body.data.id;

    const updateRes = await request
      .put(`/api/promises/${promiseId}/status`)
      .set(tenantBHeaders)
      .send({ status: 'BROKEN' });

    assert.equal(updateRes.status, 400); // Unauthorized access returns error

    const listRes = await request.get('/api/promises').set(tenantBHeaders);
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.data.length, 0); // Tenant B sees 0 promises
  });

  await t.test('4. PromiseToPay RBAC: VIEWER role CANNOT create promise commitments (403 Forbidden)', async () => {
    const res = await request
      .post('/api/promises')
      .set(viewerHeaders)
      .send({
        recoveryCaseId: 'rc_tenant_a_p10',
        promisedAmount: 750000,
        promisedDate: '2026-08-30T10:00:00Z',
      });

    assert.equal(res.status, 403);
  });

  await t.test('5. DegradationService: Detects bank/method failure spike above threshold', async () => {
    const now = new Date().toISOString();
    await paymentRepo.create({
      merchant_id: 'merch_tenant_a',
      razorpay_payment_id: 'pay_deg_1',
      razorpay_order_id: 'ord_deg_1',
      amount: 500000,
      currency: 'INR',
      method: 'upi',
      bank: 'HDFC',
      status: 'FAILED',
      created_at: now,
    });
    await paymentRepo.create({
      merchant_id: 'merch_tenant_a',
      razorpay_payment_id: 'pay_deg_2',
      razorpay_order_id: 'ord_deg_2',
      amount: 500000,
      currency: 'INR',
      method: 'upi',
      bank: 'HDFC',
      status: 'FAILED',
      created_at: now,
    });
    await paymentRepo.create({
      merchant_id: 'merch_tenant_a',
      razorpay_payment_id: 'pay_deg_3',
      razorpay_order_id: 'ord_deg_3',
      amount: 500000,
      currency: 'INR',
      method: 'upi',
      bank: 'HDFC',
      status: 'CAPTURED',
      created_at: now,
    });

    const alerts = await degradationService.detectDegradationAlerts('merch_tenant_a', 30, 0.35, 3);
    assert.ok(alerts.length > 0);
    const hdfcAlert = alerts.find((a) => a.bank === 'HDFC' && a.method === 'upi');
    assert.ok(hdfcAlert);
    assert.equal(hdfcAlert.failureCount, 2);
    assert.equal(hdfcAlert.totalAttempts, 3);
    assert.equal(hdfcAlert.suggestedAction, 'OFFER_ALTERNATE_PAYMENT');
  });

  await t.test('6. Degradation API: Returns degradation alerts for calling merchant', async () => {
    const res = await request.get('/api/degradation').set(tenantAHeaders);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
  });

  await t.test('7. Export API: Generates formatted CSV for recovery cases and audit trail', async () => {
    const casesRes = await request.get('/api/analytics/export/cases').set(tenantAHeaders);
    assert.equal(casesRes.status, 200);
    assert.ok(casesRes.text.includes('Case ID'));
    assert.ok(casesRes.text.includes('rc_tenant_a_p10'));
    assert.ok(casesRes.text.includes('7500.00'));

    const auditRes = await request.get('/api/analytics/export/audit').set(tenantAHeaders);
    assert.equal(auditRes.status, 200);
    assert.ok(auditRes.text.includes('Event ID'));
  });

  await t.test('8. Localized Notifications: Generates Hinglish and English recovery communications', async () => {
    const enMsg = notificationService.generateMessage('OFFER_ALTERNATE_PAYMENT', 'en', 750000, 'https://pay.example.com');
    assert.equal(enMsg.language, 'en');
    assert.ok(enMsg.body.includes('₹7500.00'));
    assert.ok(enMsg.body.includes('alternate payment method'));

    const hinglishMsg = notificationService.generateMessage('OFFER_ALTERNATE_PAYMENT', 'hinglish', 750000, 'https://pay.example.com');
    assert.equal(hinglishMsg.language, 'hinglish');
    assert.ok(hinglishMsg.body.includes('₹7500.00'));
    assert.ok(hinglishMsg.body.includes('doosra payment method use karke retry karein'));
  });
});
