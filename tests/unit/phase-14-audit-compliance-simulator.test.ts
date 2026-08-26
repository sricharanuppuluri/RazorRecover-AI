import assert from 'node:assert';
import { test, beforeEach, describe } from 'node:test';
import express, { Express } from 'express';
import request from 'supertest';
import apiRouter from '../../apps/api/src/routes';
import { AuditEventRepository } from '../../apps/api/src/repositories/audit-event.repository';
import { RecoveryCaseRepository } from '../../apps/api/src/repositories/recovery-case.repository';

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  return app;
}

const app = createTestApp();
const TENANT_A = 'merchant_tenant_a';
const TENANT_B = 'merchant_tenant_b';

const auditRepo = new AuditEventRepository();
const caseRepo = new RecoveryCaseRepository();

describe('Phase 14 — Audit Vault Compliance & System Recovery Simulator Test Suite', () => {
  beforeEach(async () => {
    await auditRepo.clear();
    await caseRepo.clear();

    // Create baseline audit record for Tenant A
    await auditRepo.create({
      merchant_id: TENANT_A,
      recovery_case_id: 'rc_p14_01',
      event_type: 'POLICY_EVALUATION',
      actor_type: 'system',
      actor_id: 'policy_engine',
      action: 'ALLOW_ACTION',
      decision_summary: 'Action OFFER_ALTERNATE_PAYMENT allowed under safety policy',
      outcome: 'APPROVED',
      policy_result: 'ALLOWED',
    });
  });

  describe('1. Audit Vault & Cryptographic Chain Compliance', () => {
    test('Verifies SHA-256 cryptographic chain integrity for Tenant A audit vault', async () => {
      const res = await request(app)
        .get('/api/audit-vault/vault/verify')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.merchantId, TENANT_A);
      assert.strictEqual(res.body.data.isChainIntact, true);
      assert.ok(res.body.data.rootMerkleHash.length === 64);
    });

    test('Generates SOC2 & GDPR compliance report for Tenant A', async () => {
      const res = await request(app)
        .get('/api/audit-vault/compliance')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.soc2Compliant, true);
      assert.strictEqual(res.body.data.gdprCompliant, true);
      assert.strictEqual(res.body.data.contactOptInCheckPass, true);
    });

    test('Tenant B CANNOT access Tenant A audit vault proof (Tenant Isolation)', async () => {
      const res = await request(app)
        .get('/api/audit-vault/vault/verify')
        .set('x-merchant-id', TENANT_B)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.totalEventsCount, 0); // Tenant B sees 0 events
    });
  });

  describe('2. System Recovery Orchestration Simulator', () => {
    test('Retrieves list of 5 interactive simulation scenarios', async () => {
      const res = await request(app)
        .get('/api/simulator/scenarios')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.length, 5);
      assert.strictEqual(res.body.data[0].id, 'BANK_DEGRADATION');
    });

    test('Executes BANK_DEGRADATION scenario end-to-end', async () => {
      const res = await request(app)
        .post('/api/simulator/execute-scenario')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN')
        .send({
          scenarioId: 'BANK_DEGRADATION',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.scenarioId, 'BANK_DEGRADATION');
      assert.strictEqual(res.body.data.merchantId, TENANT_A);
      assert.strictEqual(res.body.data.diagnosis, 'temporary_bank_degradation');
      assert.strictEqual(res.body.data.policyDecision, 'ALLOWED');
    });

    test('Executes VOICE_RECOVERY scenario end-to-end with custom amount', async () => {
      const res = await request(app)
        .post('/api/simulator/execute-scenario')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN')
        .send({
          scenarioId: 'VOICE_RECOVERY',
          customAmount: 2500000, // ₹25,000 in paise
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.scenarioId, 'VOICE_RECOVERY');
      assert.strictEqual(res.body.data.aiRecommendation, 'VOICE_ASSISTANT_CALL');
    });

    test('Rejects invalid scenario ID with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/simulator/execute-scenario')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'ADMIN')
        .send({
          scenarioId: 'INVALID_SCENARIO_XYZ',
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.status, 'error');
    });

    test('VIEWER role CANNOT execute simulation scenarios (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/simulator/execute-scenario')
        .set('x-merchant-id', TENANT_A)
        .set('x-user-role', 'VIEWER')
        .send({
          scenarioId: 'BANK_DEGRADATION',
        });

      assert.strictEqual(res.status, 403);
    });
  });
});
