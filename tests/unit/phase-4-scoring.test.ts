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
});
