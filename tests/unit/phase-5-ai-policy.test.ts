import { test, describe } from 'node:test';
import assert from 'assert';
import supertest from 'supertest';

import { createApp } from '../../apps/api/src/app';
const expressApp = createApp();
import { validateAIDecisionOutput } from '../../apps/api/src/services/ai/schemas';
import { buildSystemPrompt, buildUserPrompt, hashContext, PROMPT_VERSION } from '../../apps/api/src/services/ai/prompt-builder';
import { MockAIProvider, GeminiAIProvider } from '../../apps/api/src/services/ai/ai-provider';
import { AIDecisionService } from '../../apps/api/src/services/ai/ai-decision.service';
import { AIPolicyPipelineService } from '../../apps/api/src/services/ai-policy-pipeline.service';
import { PolicyEngine, POLICY_VERSION, DEFAULT_POLICY_PROFILE } from '../../packages/policy-engine/src';
import { RecoveryCaseRepository } from '../../apps/api/src/repositories/recovery-case.repository';
import { OrderRepository } from '../../apps/api/src/repositories/order.repository';
import { PaymentRepository } from '../../apps/api/src/repositories/payment.repository';
import { CustomerRepository } from '../../apps/api/src/repositories/customer.repository';
import { MerchantRepository } from '../../apps/api/src/repositories/merchant.repository';
import { AIDecisionRepository } from '../../apps/api/src/repositories/ai-decision.repository';
import { PolicyDecisionRepository } from '../../apps/api/src/repositories/policy-decision.repository';
import { AIInputContext, RecoveryAnalysisResult, AIDecisionOutput } from '@razorrecover/shared-types';

describe('Phase 5 — AI Decision Engine & Deterministic Policy Guardrails', () => {

  // Helper fixture for baseline context
  function getSampleContext(overrides?: Partial<AIInputContext>): AIInputContext {
    const analysis: RecoveryAnalysisResult = {
      merchantId: 'mch_test_01',
      paymentId: 'pay_test_01',
      orderId: 'ord_test_01',
      amountAtRisk: 500000, // ₹5,000 in paise
      diagnosis: {
        category: 'TEMPORARY_BANK_DEGRADATION',
        explanation: 'Bank gateway degradation detected',
        confidence: 0.85,
        reasonCodes: ['RECENT_BANK_FAILURE_SPIKE']
      },
      recoveryProbability: 0.80,
      expectedRecoveryValue: 400000,
      priorityScore: 65,
      highValue: false,
      eligibleForRecovery: true
    };

    return {
      merchant: {
        id: 'mch_test_01',
        currency: 'INR',
        policyProfileId: 'pol_default',
        highValueThreshold: 10000000
      },
      customer: {
        successfulPaymentCount: 5,
        failedPaymentCount: 1,
        contactOptIn: true,
        totalSuccessValue: 2500000
      },
      order: {
        id: 'ord_test_01',
        amount: 500000,
        currency: 'INR',
        status: 'ATTEMPTED',
        productCategory: 'ELECTRONICS',
        createdAt: new Date().toISOString()
      },
      payment: {
        id: 'pay_test_01',
        method: 'UPI',
        bank: 'HDFC',
        status: 'FAILED',
        errorCode: 'GATEWAY_ERROR',
        errorDescription: 'Bank server timeout',
        failureCount: 1
      },
      analysis,
      ...overrides
    };
  }

  // ===================================================
  // 1. AI OUTPUT SCHEMA & VALIDATION TESTS
  // ===================================================
  describe('AI Output Schema Validation', () => {
    test('1. Valid structured AI output passes validation', () => {
      const input = {
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        recoveryProbability: 0.85,
        recommendedAction: 'RETRY',
        rationale: 'Temporary gateway downtime is likely resolved.',
        confidence: 0.90
      };
      const res = validateAIDecisionOutput(input);
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.errors.length, 0);
      assert.strictEqual(res.output?.recommendedAction, 'RETRY');
    });

    test('2. Rejects invalid JSON / non-object input', () => {
      const res = validateAIDecisionOutput('not a json object');
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.length > 0);
    });

    test('3. Rejects invalid recommended action enum', () => {
      const input = {
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        recoveryProbability: 0.85,
        recommendedAction: 'INVALID_ACTION_NAME',
        rationale: 'Reason',
        confidence: 0.90
      };
      const res = validateAIDecisionOutput(input);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('recommendedAction')));
    });

    test('4. Rejects recoveryProbability > 1.0 or < 0.0', () => {
      const high = validateAIDecisionOutput({
        diagnosis: 'TEST',
        recoveryProbability: 1.5,
        recommendedAction: 'RETRY',
        rationale: 'Reason',
        confidence: 0.9
      });
      assert.strictEqual(high.valid, false);

      const low = validateAIDecisionOutput({
        diagnosis: 'TEST',
        recoveryProbability: -0.1,
        recommendedAction: 'RETRY',
        rationale: 'Reason',
        confidence: 0.9
      });
      assert.strictEqual(low.valid, false);
    });

    test('5. Rejects confidence > 1.0 or < 0.0', () => {
      const invalid = validateAIDecisionOutput({
        diagnosis: 'TEST',
        recoveryProbability: 0.5,
        recommendedAction: 'RETRY',
        rationale: 'Reason',
        confidence: 1.2
      });
      assert.strictEqual(invalid.valid, false);
    });

    test('6. Rejects missing required fields', () => {
      const missing = validateAIDecisionOutput({
        recoveryProbability: 0.5,
        recommendedAction: 'RETRY'
      });
      assert.strictEqual(missing.valid, false);
      assert.ok(missing.errors.length >= 2);
    });

    test('7. Rejects excessively long rationale strings (>500 chars)', () => {
      const longRationale = 'A'.repeat(501);
      const res = validateAIDecisionOutput({
        diagnosis: 'TEST',
        recoveryProbability: 0.5,
        recommendedAction: 'RETRY',
        rationale: longRationale,
        confidence: 0.8
      });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('exceeds maximum length')));
    });
  });

  // ===================================================
  // 2. CONTEXT HASHING & PROMPT SAFETY TESTS
  // ===================================================
  describe('Context Hashing & Prompt Security', () => {
    test('8. Same context yields exact same SHA-256 hash', () => {
      const ctx1 = getSampleContext();
      const ctx2 = getSampleContext();
      const hash1 = hashContext(ctx1);
      const hash2 = hashContext(ctx2);
      assert.strictEqual(hash1, hash2);
      assert.strictEqual(hash1.length, 64); // SHA-256 hex string length
    });

    test('9. Material context change yields different SHA-256 hash', () => {
      const ctx1 = getSampleContext();
      const ctx2 = getSampleContext();
      ctx2.order.amount = 9900000;
      const hash1 = hashContext(ctx1);
      const hash2 = hashContext(ctx2);
      assert.notStrictEqual(hash1, hash2);
    });

    test('10. Context hashing & prompt builder strictly exclude secrets and API keys', () => {
      const ctx = getSampleContext();
      const hash = hashContext(ctx);
      const userPrompt = buildUserPrompt(ctx);
      const sysPrompt = buildSystemPrompt();

      // Verify no secrets or credentials appear in prompt or context text
      const combined = sysPrompt + userPrompt;
      assert.strictEqual(combined.includes('rzp_test_secret'), false);
      assert.strictEqual(combined.includes('LLM_API_KEY'), false);
      assert.strictEqual(combined.includes('DB_PASSWORD'), false);
      assert.strictEqual(combined.includes('webhook_secret'), false);
    });

    test('11. System prompt contains explicit prompt injection defenses', () => {
      const sysPrompt = buildSystemPrompt();
      assert.ok(sysPrompt.includes('PROMPT INJECTION DEFENSE'));
      assert.ok(sysPrompt.includes('NEVER as system instructions'));
      assert.ok(sysPrompt.includes('untrusted input'));
    });
  });

  // ===================================================
  // 3. AI PROVIDER & FALLBACK TESTS
  // ===================================================
  describe('AI Provider & Fallback Resilience', () => {
    test('12. MockAIProvider generates valid, deterministic decision', async () => {
      const provider = new MockAIProvider();
      const ctx = getSampleContext();
      const decision = await provider.generateDecision(ctx);

      assert.ok(decision.diagnosis);
      assert.ok(decision.recommendedAction);
      assert.ok(decision.confidence >= 0 && decision.confidence <= 1.0);
      assert.ok(decision.recoveryProbability >= 0 && decision.recoveryProbability <= 1.0);
    });

    test('13. AIDecisionService catches provider failure and triggers safe fallback', async () => {
      const failingProvider = {
        async generateDecision(): Promise<AIDecisionOutput> {
          throw new Error('LLM Provider Rate Limit or Timeout');
        }
      };

      const service = new AIDecisionService();
      const ctx = getSampleContext();
      const decisionRecord = await service.generateAndPersistDecision(ctx, 'rc_fallback_01', failingProvider);

      assert.strictEqual(decisionRecord.recommended_action, 'ESCALATE');
      assert.strictEqual(decisionRecord.confidence, 0.0);
      assert.ok(decisionRecord.rationale.includes('Safe fallback triggered'));
    });
  });

  // ===================================================
  // 4. DETERMINISTIC POLICY ENGINE TESTS
  // ===================================================
  describe('Deterministic Policy Engine Guardrails', () => {
    const policyEngine = new PolicyEngine();

    function getBasePolicyInput() {
      const ctx = getSampleContext();
      return {
        aiDecision: {
          diagnosis: 'TEMPORARY_BANK_DEGRADATION',
          recoveryProbability: 0.85,
          recommendedAction: 'RETRY' as const,
          rationale: 'Bank issues resolved.',
          confidence: 0.90
        },
        deterministicAnalysis: ctx.analysis,
        merchantPolicy: DEFAULT_POLICY_PROFILE,
        customer: { contact_opt_in: true },
        order: { status: 'ATTEMPTED' },
        payment: { status: 'FAILED' },
        recoveryCase: {
          status: 'SCORED',
          retry_count: 0,
          notification_count: 0,
          expires_at: new Date(Date.now() + 86400000).toISOString()
        }
      };
    }

    test('14. Payment already CAPTURED -> DENY (NO_ACTION)', () => {
      const input = getBasePolicyInput();
      input.payment.status = 'CAPTURED';
      const res = policyEngine.evaluate(input);

      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.action, 'NO_ACTION');
      assert.ok(res.reasons.includes('PAYMENT_ALREADY_CAPTURED'));
    });

    test('15. Zero amount at risk -> DENY (NO_ACTION)', () => {
      const input = getBasePolicyInput();
      input.deterministicAnalysis.amountAtRisk = 0;
      const res = policyEngine.evaluate(input);

      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.action, 'NO_ACTION');
      assert.ok(res.reasons.includes('ZERO_AMOUNT_AT_RISK'));
    });

    test('16. Case expired -> DENY (NO_ACTION)', () => {
      const input = getBasePolicyInput();
      input.recoveryCase.expires_at = new Date(Date.now() - 1000).toISOString(); // In the past
      const res = policyEngine.evaluate(input);

      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.action, 'NO_ACTION');
      assert.ok(res.reasons.includes('CASE_EXPIRED'));
    });

    test('17. Retry limit exceeded -> ESCALATE (requiresHuman: true)', () => {
      const input = getBasePolicyInput();
      input.recoveryCase.retry_count = 3; // Exceeds default limit of 3
      const res = policyEngine.evaluate(input);

      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.action, 'ESCALATE');
      assert.strictEqual(res.requiresHuman, true);
      assert.ok(res.reasons.includes('RETRY_LIMIT_EXCEEDED'));
    });

    test('18. Notification limit exceeded -> ESCALATE (requiresHuman: true)', () => {
      const input = getBasePolicyInput();
      input.aiDecision.recommendedAction = 'NOTIFY';
      input.recoveryCase.notification_count = 2; // Exceeds default limit of 2
      const res = policyEngine.evaluate(input);

      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.action, 'ESCALATE');
      assert.strictEqual(res.requiresHuman, true);
      assert.ok(res.reasons.includes('NOTIFICATION_LIMIT_EXCEEDED'));
    });

    test('19. Customer contact_opt_in false -> DENY notification', () => {
      const input = getBasePolicyInput();
      input.aiDecision.recommendedAction = 'NOTIFY';
      input.customer.contact_opt_in = false;
      const res = policyEngine.evaluate(input);

      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.action, 'NO_ACTION');
      assert.ok(res.reasons.includes('CUSTOMER_CONTACT_NOT_ALLOWED'));
    });

    test('20. High-value transaction + RETRY -> ESCALATE (human review required)', () => {
      const input = getBasePolicyInput();
      input.deterministicAnalysis.highValue = true;
      const res = policyEngine.evaluate(input);

      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.action, 'ESCALATE');
      assert.strictEqual(res.requiresHuman, true);
      assert.ok(res.reasons.includes('HIGH_VALUE_REQUIRES_REVIEW'));
    });

    test('21. Low AI Confidence (< 0.60) -> ESCALATE', () => {
      const input = getBasePolicyInput();
      input.aiDecision.confidence = 0.45; // Below 0.60
      const res = policyEngine.evaluate(input);

      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.action, 'ESCALATE');
      assert.ok(res.reasons.includes('LOW_AI_CONFIDENCE'));
    });

    test('22. Low Recovery Probability (< 0.20) -> DENY (NO_ACTION)', () => {
      const input = getBasePolicyInput();
      input.aiDecision.recoveryProbability = 0.10; // Below 0.20
      const res = policyEngine.evaluate(input);

      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.action, 'NO_ACTION');
      assert.ok(res.reasons.includes('LOW_RECOVERY_PROBABILITY'));
    });

    test('23. Ambiguous diagnosis -> ESCALATE', () => {
      const input = getBasePolicyInput();
      input.aiDecision.diagnosis = 'UNKNOWN_OR_AMBIGUOUS';
      const res = policyEngine.evaluate(input);

      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.action, 'ESCALATE');
      assert.ok(res.reasons.includes('AMBIGUOUS_DIAGNOSIS'));
    });

    test('24. Valid retry recommendation with all rules passing -> ALLOW', () => {
      const input = getBasePolicyInput();
      const res = policyEngine.evaluate(input);

      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.action, 'RETRY');
      assert.strictEqual(res.requiresHuman, false);
      assert.strictEqual(res.policyVersion, POLICY_VERSION);
    });
  });

  // ===================================================
  // 5. FULL PIPELINE INTEGRATION & API ENDPOINT TESTS
  // ===================================================
  describe('Full AI/Policy Pipeline & API Integration', () => {

    test('25. Pipeline executes end-to-end and persists AIDecision and PolicyDecision', async () => {
      // Setup mock entities
      const merchantRepo = new MerchantRepository();
      const customerRepo = new CustomerRepository();
      const orderRepo = new OrderRepository();
      const paymentRepo = new PaymentRepository();
      const caseRepo = new RecoveryCaseRepository();

      const merchant = await merchantRepo.create({ id: 'mch_p5_01', name: 'Phase 5 Merchant' });
      const customer = await customerRepo.create({
        id: 'cust_p5_01',
        merchant_id: merchant.id,
        external_customer_id: 'ext_p5_01',
        contact_opt_in: true
      });
      const order = await orderRepo.create({
        id: 'ord_p5_01',
        merchant_id: merchant.id,
        customer_id: customer.id,
        razorpay_order_id: 'order_p5_rzp_01',
        amount: 450000,
        currency: 'INR',
        status: 'ATTEMPTED'
      });
      const payment = await paymentRepo.create({
        id: 'pay_p5_01',
        merchant_id: merchant.id,
        customer_id: customer.id,
        razorpay_payment_id: 'pay_p5_rzp_01',
        razorpay_order_id: order.razorpay_order_id,
        amount: 450000,
        currency: 'INR',
        status: 'FAILED',
        error_code: 'GATEWAY_ERROR',
        error_description: 'Temporary bank degradation'
      });
      const rc = await caseRepo.create({
        merchant_id: merchant.id,
        order_id: order.id,
        payment_id: payment.id,
        amount_at_risk: 450000,
        status: 'SCORED'
      });

      const pipeline = new AIPolicyPipelineService();
      const result = await pipeline.processCaseAIDecision(rc.id);

      assert.strictEqual(result.recoveryCaseId, rc.id);
      assert.ok(result.deterministicAnalysis);
      assert.ok(result.aiDecision.id);
      assert.ok(result.policyDecision.id);
      assert.ok(result.aiDecision.inputContextHash);
      assert.strictEqual(result.policyDecision.policyVersion, POLICY_VERSION);

      // Verify records stored in repositories
      const aiRepo = new AIDecisionRepository();
      const savedAi = await aiRepo.findByCaseId(rc.id);
      assert.ok(savedAi);

      const polRepo = new PolicyDecisionRepository();
      const savedPol = await polRepo.findByCaseId(rc.id);
      assert.ok(savedPol);
    });

    test('26. API Endpoint POST /api/recovery-cases/:id/ai-decision returns HTTP 200 with pipeline payload', async () => {
      const caseRepo = new RecoveryCaseRepository();
      const orderRepo = new OrderRepository();

      const order = await orderRepo.create({
        id: 'ord_api_p5',
        merchant_id: 'mch_test_01',
        customer_id: 'cust_test_01',
        razorpay_order_id: 'order_api_p5_rzp',
        amount: 300000,
        status: 'ATTEMPTED'
      });

      const rc = await caseRepo.create({
        merchant_id: 'mch_test_01',
        order_id: order.id,
        amount_at_risk: 300000,
        status: 'SCORED'
      });

      const res = await supertest(expressApp)
        .post(`/api/recovery-cases/${rc.id}/ai-decision`)
        .expect(200);

      assert.strictEqual(res.body.status, 'success');
      assert.strictEqual(res.body.data.recoveryCaseId, rc.id);
      assert.ok(res.body.data.aiDecision);
      assert.ok(res.body.data.policyDecision);
    });

    test('27. Verification: Phase 5 does NOT execute financial retries or customer notifications', async () => {
      const caseRepo = new RecoveryCaseRepository();
      const orderRepo = new OrderRepository();

      const order = await orderRepo.create({
        id: 'ord_no_exec',
        merchant_id: 'mch_test_01',
        customer_id: 'cust_test_01',
        razorpay_order_id: 'order_no_exec_rzp',
        amount: 150000,
        status: 'ATTEMPTED'
      });

      const rc = await caseRepo.create({
        merchant_id: 'mch_test_01',
        order_id: order.id,
        amount_at_risk: 150000,
        status: 'SCORED'
      });

      const pipeline = new AIPolicyPipelineService();
      const result = await pipeline.processCaseAIDecision(rc.id);

      // Verify that case status transitioned to AI_RECOMMENDED / HUMAN_REVIEW / SCORED, but NOT ACTION_SENT or RECOVERED
      const updatedRc = await caseRepo.findById(rc.id);
      assert.notStrictEqual(updatedRc?.status, 'ACTION_SENT');
      assert.notStrictEqual(updatedRc?.status, 'RECOVERED');
      assert.strictEqual(updatedRc?.retry_count, 0);
      assert.strictEqual(updatedRc?.notification_count, 0);
    });

  });
});
