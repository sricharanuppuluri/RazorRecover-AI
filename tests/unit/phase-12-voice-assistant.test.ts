import assert from 'node:assert';
import { test, beforeEach, describe } from 'node:test';
import express, { Express } from 'express';
import request from 'supertest';
import apiRouter from '../../apps/api/src/routes';
import { VoiceSessionRepository } from '../../apps/api/src/repositories/voice-session.repository';
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

const voiceRepo = new VoiceSessionRepository();
const caseRepo = new RecoveryCaseRepository();
const auditRepo = new AuditEventRepository();

describe('Phase 12 — Voice Recovery Assistant Test Suite', () => {
  beforeEach(async () => {
    await voiceRepo.clear();
    await caseRepo.clear();
    await auditRepo.clear();
  });

  describe('1. Voice Call Initiation & Greeting', () => {
    test('Initiates Hinglish voice call for eligible recovery case', async () => {
      await caseRepo.create({
        id: 'rc_voice_01',
        merchant_id: TENANT_A,
        order_id: 'ord_v_01',
        payment_id: 'pay_v_01',
        case_type: 'PAYMENT_FAILURE',
        amount_at_risk: 1500000, // ₹15,000 in paise
        recoverability_score: 0.85,
        expected_recovery_value: 1275000,
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        diagnosis_confidence: 0.9,
        recommended_action: 'SEND_RECOVERY_LINK',
        action_confidence: 0.85,
        policy_decision: 'APPROVED',
        status: 'NEW',
        retry_count: 0,
        notification_count: 0,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });

      const res = await request(app)
        .post('/api/voice/calls')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'OPERATOR')
        .send({ recoveryCaseId: 'rc_voice_01', language: 'HINGLISH' });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.merchantId, TENANT_A);
      assert.strictEqual(res.body.data.language, 'HINGLISH');
      assert.strictEqual(res.body.data.status, 'INITIATED');
      assert.ok(res.body.data.transcript[0].text.includes('Razorpay Merchant AI Support'));
    });

    test('Cannot initiate voice call for RECOVERED case', async () => {
      await caseRepo.create({
        id: 'rc_voice_rec',
        merchant_id: TENANT_A,
        order_id: 'ord_v_rec',
        payment_id: 'pay_v_rec',
        case_type: 'PAYMENT_FAILURE',
        amount_at_risk: 500000,
        recoverability_score: 0.9,
        expected_recovery_value: 450000,
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        diagnosis_confidence: 0.9,
        recommended_action: 'SEND_RECOVERY_LINK',
        action_confidence: 0.85,
        policy_decision: 'APPROVED',
        status: 'RECOVERED',
        retry_count: 1,
        notification_count: 1,
        started_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
        recovered_amount: 500000,
      });

      const res = await request(app)
        .post('/api/voice/calls')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN')
        .send({ recoveryCaseId: 'rc_voice_rec' });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.message.includes('Cannot initiate voice recovery call'));
    });
  });

  describe('2. Voice Interaction & Intent Resolution', () => {
    test('Customer requests payment link via Hinglish voice input', async () => {
      await caseRepo.create({
        id: 'rc_voice_02',
        merchant_id: TENANT_A,
        order_id: 'ord_v_02',
        payment_id: 'pay_v_02',
        case_type: 'PAYMENT_FAILURE',
        amount_at_risk: 350000,
        recoverability_score: 0.80,
        expected_recovery_value: 280000,
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        diagnosis_confidence: 0.85,
        recommended_action: 'SEND_RECOVERY_LINK',
        action_confidence: 0.80,
        policy_decision: 'APPROVED',
        status: 'NEW',
        retry_count: 0,
        notification_count: 0,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });

      const initRes = await request(app)
        .post('/api/voice/calls')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN')
        .send({ recoveryCaseId: 'rc_voice_02', language: 'HINGLISH' });

      const sessionId = initRes.body.data.id;

      const interactRes = await request(app)
        .post(`/api/voice/calls/${sessionId}/interact`)
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN')
        .send({ userUtterance: 'Ha WhatsApp par payment link bhejo' });

      assert.strictEqual(interactRes.status, 200);
      assert.strictEqual(interactRes.body.data.session.detectedIntent, 'REQUEST_PAYMENT_LINK');
      assert.strictEqual(interactRes.body.data.session.executedAction, 'SEND_RECOVERY_LINK');

      // Verify case state is preserved (ACTION_SUCCEEDED != RECOVERED)
      const caseRecord = await caseRepo.findById('rc_voice_02');
      assert.notStrictEqual(caseRecord?.status, 'RECOVERED');
    });

    test('Customer requests opt-out via voice input', async () => {
      await caseRepo.create({
        id: 'rc_voice_03',
        merchant_id: TENANT_A,
        order_id: 'ord_v_03',
        payment_id: 'pay_v_03',
        case_type: 'PAYMENT_FAILURE',
        amount_at_risk: 200000,
        recoverability_score: 0.60,
        expected_recovery_value: 120000,
        diagnosis: 'UNKNOWN',
        diagnosis_confidence: 0.5,
        recommended_action: 'WAIT_AND_RETRY',
        action_confidence: 0.6,
        policy_decision: 'APPROVED',
        status: 'NEW',
        retry_count: 0,
        notification_count: 0,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });

      const initRes = await request(app)
        .post('/api/voice/calls')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'OPERATOR')
        .send({ recoveryCaseId: 'rc_voice_03', language: 'HINGLISH' });

      const sessionId = initRes.body.data.id;

      const interactRes = await request(app)
        .post(`/api/voice/calls/${sessionId}/interact`)
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'OPERATOR')
        .send({ userUtterance: 'Mujhe call mat karo cancel' });

      assert.strictEqual(interactRes.status, 200);
      assert.strictEqual(interactRes.body.data.session.status, 'OPTED_OUT');
      assert.strictEqual(interactRes.body.data.session.detectedIntent, 'OPTOUT');

      const caseRecord = await caseRepo.findById('rc_voice_03');
      assert.strictEqual(caseRecord?.status, 'STOPPED');
    });
  });

  describe('3. Multi-Tenant Isolation & RBAC Security', () => {
    test('Tenant B CANNOT access Tenant A voice sessions (Tenant Isolation)', async () => {
      await caseRepo.create({
        id: 'rc_voice_iso',
        merchant_id: TENANT_A,
        order_id: 'ord_iso',
        payment_id: 'pay_iso',
        case_type: 'PAYMENT_FAILURE',
        amount_at_risk: 100000,
        recoverability_score: 0.8,
        expected_recovery_value: 80000,
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        diagnosis_confidence: 0.8,
        recommended_action: 'WAIT_AND_RETRY',
        action_confidence: 0.8,
        policy_decision: 'APPROVED',
        status: 'NEW',
        retry_count: 0,
        notification_count: 0,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });

      const initRes = await request(app)
        .post('/api/voice/calls')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN')
        .send({ recoveryCaseId: 'rc_voice_iso' });

      const sessionId = initRes.body.data.id;

      const tenantBRes = await request(app)
        .get(`/api/voice/calls/${sessionId}`)
        .set('x-merchant-id', TENANT_B)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(tenantBRes.status, 404);
    });

    test('VIEWER role CANNOT initiate or interact with voice calls (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/voice/calls')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'VIEWER')
        .send({ recoveryCaseId: 'rc_voice_iso' });

      assert.strictEqual(res.status, 403);
    });
  });
});
