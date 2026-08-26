import assert from 'node:assert';
import { test, describe } from 'node:test';
import { DiagnosisService } from '../../apps/api/src/services/diagnosis.service';
import { ScoringService } from '../../apps/api/src/services/scoring.service';
import { RecoveryAnalysisService } from '../../apps/api/src/services/recovery-analysis.service';
import { PaymentRepository } from '../../apps/api/src/repositories/payment.repository';
import { OrderRepository } from '../../apps/api/src/repositories/order.repository';

describe('Phase 4 — Failure Taxonomy & Recovery Risk Scoring Engine', () => {
  const diagnosisService = new DiagnosisService();
  const scoringService = new ScoringService();
  const analysisService = new RecoveryAnalysisService();

  describe('DiagnosisService (Failure Taxonomy)', () => {
    test('1. Diagnoses ALREADY_CAPTURED when payment status is CAPTURED or order is PAID', () => {
      const result1 = diagnosisService.diagnose({ paymentStatus: 'CAPTURED', orderAmount: 500000 });
      assert.strictEqual(result1.category, 'ALREADY_CAPTURED');
      assert.strictEqual(result1.confidence, 1.0);

      const result2 = diagnosisService.diagnose({ orderStatus: 'PAID', orderAmount: 500000, capturedAmount: 500000 });
      assert.strictEqual(result2.category, 'ALREADY_CAPTURED');
    });

    test('2. Diagnoses REPEATED_FAILURE when failure count >= 3 or repeated error code', () => {
      const result = diagnosisService.diagnose({ failureCount: 3, errorCode: 'BAD_REQUEST_ERROR' });
      assert.strictEqual(result.category, 'REPEATED_FAILURE');
      assert.strictEqual(result.confidence, 0.90);
      assert.ok(result.reasonCodes.includes('REPEATED_FAILURES'));
    });

    test('3. Diagnoses INSUFFICIENT_FUNDS on explicit balance/limit signals', () => {
      const result = diagnosisService.diagnose({
        errorCode: 'BAD_REQUEST_INSUFFICIENT_BALANCE',
        errorDescription: 'Your bank account has insufficient funds'
      });
      assert.strictEqual(result.category, 'INSUFFICIENT_FUNDS');
      assert.strictEqual(result.confidence, 0.95);
      assert.ok(result.reasonCodes.includes('INSUFFICIENT_FUNDS_SIGNAL'));
    });

    test('4. Diagnoses CUSTOMER_AUTHENTICATION_ISSUE on OTP/3DS/Timeout failures', () => {
      const result = diagnosisService.diagnose({
        errorCode: 'BAD_REQUEST_PAYMENT_TIMED_OUT',
        errorDescription: 'OTP validation timed out'
      });
      assert.strictEqual(result.category, 'CUSTOMER_AUTHENTICATION_ISSUE');
      assert.strictEqual(result.confidence, 0.90);
      assert.ok(result.reasonCodes.includes('AUTHENTICATION_FAILURE'));
    });

    test('5. Diagnoses TEMPORARY_BANK_DEGRADATION on gateway errors or failure rate spikes', () => {
      const result1 = diagnosisService.diagnose({
        errorCode: 'GATEWAY_ERROR',
        errorDescription: 'Issuer bank server is offline'
      });
      assert.strictEqual(result1.category, 'TEMPORARY_BANK_DEGRADATION');
      assert.strictEqual(result1.confidence, 0.85);

      const result2 = diagnosisService.diagnose({
        recentBankFailureRate: 0.35
      });
      assert.strictEqual(result2.category, 'TEMPORARY_BANK_DEGRADATION');
      assert.ok(result2.reasonCodes.includes('RECENT_BANK_FAILURE_SPIKE'));
    });

    test('6. Diagnoses CHECKOUT_ABANDONMENT when session timed out before payment', () => {
      const result = diagnosisService.diagnose({ isCheckoutAbandoned: true });
      assert.strictEqual(result.category, 'CHECKOUT_ABANDONMENT');
      assert.strictEqual(result.confidence, 0.85);
      assert.ok(result.reasonCodes.includes('CHECKOUT_TIMEOUT'));
    });

    test('7. Defaults to UNKNOWN_OR_AMBIGUOUS when evidence is weak', () => {
      const result = diagnosisService.diagnose({});
      assert.strictEqual(result.category, 'UNKNOWN_OR_AMBIGUOUS');
      assert.strictEqual(result.confidence, 0.30);
      assert.ok(result.reasonCodes.includes('INSUFFICIENT_EVIDENCE'));
    });
  });

  describe('ScoringService (Revenue Risk & Opportunity Scoring)', () => {
    test('8. Calculates exact amountAtRisk and flags highValue transactions', () => {
      const result = scoringService.calculate({
        orderAmount: 15000000, // ₹1,50,000 in paise
        capturedAmount: 0,
        category: 'TEMPORARY_BANK_DEGRADATION',
        highValueThreshold: 10000000 // ₹1,00,000
      });

      assert.strictEqual(result.amountAtRisk, 15000000);
      assert.strictEqual(result.highValue, true);
    });

    test('9. Calculates expectedRecoveryValue and priorityScore deterministically', () => {
      const result = scoringService.calculate({
        orderAmount: 750000, // ₹7,500
        capturedAmount: 0,
        category: 'TEMPORARY_BANK_DEGRADATION',
        previousSuccessCount: 2, // repeat customer bonus +0.10
        contactOptIn: true // opt-in bonus +0.05
      });

      // Base prob 0.85 + 0.10 + 0.05 = 1.0 (clamped)
      assert.strictEqual(result.recoveryProbability, 1.0);
      assert.strictEqual(result.expectedRecoveryValue, 750000);
      assert.ok(result.priorityScore > 0);
    });

    test('10. Returns zero probability and expected value for ALREADY_CAPTURED', () => {
      const result = scoringService.calculate({
        orderAmount: 500000,
        capturedAmount: 500000,
        category: 'ALREADY_CAPTURED'
      });

      assert.strictEqual(result.amountAtRisk, 0);
      assert.strictEqual(result.recoveryProbability, 0.0);
      assert.strictEqual(result.expectedRecoveryValue, 0);
      assert.strictEqual(result.priorityScore, 0);
      assert.strictEqual(result.highValue, false);
    });
  });

  describe('RecoveryAnalysisService Pipeline Integration', () => {
    test('11. Runs full analysis pipeline and persists RecoveryCase', async () => {
      const paymentRepo = new PaymentRepository();
      const orderRepo = new OrderRepository();

      const orderId = `order_test_${Date.now()}`;
      await orderRepo.create({
        id: orderId,
        razorpay_order_id: orderId,
        merchant_id: 'mch_test_01',
        amount: 750000,
        currency: 'INR',
        status: 'ATTEMPTED'
      });

      const payment = await paymentRepo.create({
        razorpay_order_id: orderId,
        merchant_id: 'mch_test_01',
        amount: 750000,
        status: 'FAILED',
        error_code: 'GATEWAY_ERROR',
        error_description: 'Bank server is temporarily down',
        bank: 'HDFC'
      });

      const analysis = await analysisService.analyzePayment({
        paymentId: payment.id,
        correlationId: 'corr_unit_test'
      });

      assert.strictEqual(analysis.merchantId, 'mch_test_01');
      assert.strictEqual(analysis.amountAtRisk, 750000);
      assert.strictEqual(analysis.diagnosis.category, 'TEMPORARY_BANK_DEGRADATION');
      assert.strictEqual(analysis.eligibleForRecovery, true);
      assert.ok(analysis.recoveryCaseId);
    });
  });

  describe('Required Edge Cases (Verification Suite)', () => {
    test('12. Handles order amount = 0 safely', () => {
      const result = scoringService.calculate({
        orderAmount: 0,
        capturedAmount: 0,
        category: 'TEMPORARY_BANK_DEGRADATION'
      });
      assert.strictEqual(result.amountAtRisk, 0);
      assert.strictEqual(result.recoveryProbability, 0.0);
      assert.strictEqual(result.expectedRecoveryValue, 0);
      assert.strictEqual(result.priorityScore, 0);
    });

    test('13. Handles captured amount > order amount safely', () => {
      const result = scoringService.calculate({
        orderAmount: 500000,
        capturedAmount: 600000,
        category: 'CUSTOMER_AUTHENTICATION_ISSUE'
      });
      assert.strictEqual(result.amountAtRisk, 0);
      assert.strictEqual(result.expectedRecoveryValue, 0);
      assert.strictEqual(result.priorityScore, 0);
    });

    test('14. Handles very large monetary amount without integer overflow or float precision loss', () => {
      const largeAmount = 100000000000; // ₹1,000,000,000 in paise (₹100 Crore)
      const result = scoringService.calculate({
        orderAmount: largeAmount,
        capturedAmount: 0,
        category: 'TEMPORARY_BANK_DEGRADATION' // 0.85 - 0.05 (highValue) = 0.80
      });
      assert.strictEqual(result.amountAtRisk, largeAmount);
      assert.strictEqual(result.highValue, true);
      assert.strictEqual(result.recoveryProbability, 0.80);
      assert.strictEqual(result.expectedRecoveryValue, 80000000000); // 80% of ₹100 Crore = ₹80 Crore
      assert.strictEqual(Number.isInteger(result.expectedRecoveryValue), true);
      assert.strictEqual(Number.isInteger(result.priorityScore), true);
    });

    test('15. Handles context with no customer history (0 previous successes)', () => {
      const result = scoringService.calculate({
        orderAmount: 100000,
        category: 'CUSTOMER_AUTHENTICATION_ISSUE',
        previousSuccessCount: 0
      });
      assert.strictEqual(result.recoveryProbability, 0.70);
      assert.strictEqual(result.customerIntentFactor, 1.0);
    });

    test('16. Handles context with no bank information or missing error reason', () => {
      const diag = diagnosisService.diagnose({
        paymentStatus: 'FAILED',
        bank: undefined,
        errorReason: undefined
      });
      assert.strictEqual(diag.category, 'UNKNOWN_OR_AMBIGUOUS');

      const score = scoringService.calculate({
        orderAmount: 200000,
        category: diag.category
      });
      assert.strictEqual(score.recoveryProbability, 0.30);
    });

    test('17. Handles repeated failures (high failure count)', () => {
      const diag = diagnosisService.diagnose({ failureCount: 5 });
      assert.strictEqual(diag.category, 'REPEATED_FAILURE');

      const score = scoringService.calculate({
        orderAmount: 300000,
        category: diag.category,
        failureCount: 5
      });
      // Base 0.20 - min(0.20, (5-1)*0.05) = 0.0
      assert.strictEqual(score.recoveryProbability, 0.0);
      assert.strictEqual(score.expectedRecoveryValue, 0);
    });

    test('18. Handles conflicting failure signals (ALREADY_CAPTURED takes precedence)', () => {
      const diag = diagnosisService.diagnose({
        paymentStatus: 'CAPTURED',
        failureCount: 5,
        errorCode: 'BAD_REQUEST_INSUFFICIENT_BALANCE',
        errorDescription: 'Insufficient funds'
      });
      assert.strictEqual(diag.category, 'ALREADY_CAPTURED');
      assert.strictEqual(diag.confidence, 1.0);
    });

    test('19. Handles already captured payment and already paid order', () => {
      const diag1 = diagnosisService.diagnose({ paymentStatus: 'CAPTURED' });
      assert.strictEqual(diag1.category, 'ALREADY_CAPTURED');

      const diag2 = diagnosisService.diagnose({ orderStatus: 'PAID' });
      assert.strictEqual(diag2.category, 'ALREADY_CAPTURED');
    });

    test('20. Evaluates high-value threshold boundaries (exact, 1 below, 1 above)', () => {
      const threshold = 10000000; // ₹1,00,000

      // Exact threshold
      const scoreExact = scoringService.calculate({
        orderAmount: 10000000,
        category: 'TEMPORARY_BANK_DEGRADATION',
        highValueThreshold: threshold
      });
      assert.strictEqual(scoreExact.highValue, true);

      // 1 unit below threshold
      const scoreBelow = scoringService.calculate({
        orderAmount: 9999999,
        category: 'TEMPORARY_BANK_DEGRADATION',
        highValueThreshold: threshold
      });
      assert.strictEqual(scoreBelow.highValue, false);

      // 1 unit above threshold
      const scoreAbove = scoringService.calculate({
        orderAmount: 10000001,
        category: 'TEMPORARY_BANK_DEGRADATION',
        highValueThreshold: threshold
      });
      assert.strictEqual(scoreAbove.highValue, true);
    });

    test('21. Bounds recovery probability strictly between 0 and 1', () => {
      // Test lower bound (0.0)
      const scoreMin = scoringService.calculate({
        orderAmount: 500000,
        category: 'REPEATED_FAILURE', // base 0.20
        failureCount: 5, // -0.20 penalty
        recentBankFailureRate: 0.30 // -0.10 penalty
      });
      assert.strictEqual(scoreMin.recoveryProbability, 0.0);
      assert.strictEqual(scoreMin.expectedRecoveryValue, 0);

      // Test upper bound (1.0)
      const scoreMax = scoringService.calculate({
        orderAmount: 500000,
        category: 'TEMPORARY_BANK_DEGRADATION', // base 0.85
        previousSuccessCount: 3, // +0.10 bonus
        contactOptIn: true // +0.05 bonus
      });
      assert.strictEqual(scoreMax.recoveryProbability, 1.0);
      assert.strictEqual(scoreMax.expectedRecoveryValue, 500000);
    });

    test('22. Guarantees deterministic repeated calculations (identical context -> identical output)', () => {
      const context = {
        orderAmount: 850000,
        capturedAmount: 0,
        category: 'CUSTOMER_AUTHENTICATION_ISSUE' as const,
        previousSuccessCount: 1,
        failureCount: 1,
        recentBankFailureRate: 0.1,
        contactOptIn: true
      };

      const run1 = scoringService.calculate(context);
      const run2 = scoringService.calculate(context);
      const run3 = scoringService.calculate(context);

      assert.deepStrictEqual(run1, run2);
      assert.deepStrictEqual(run2, run3);
    });
  });
});
