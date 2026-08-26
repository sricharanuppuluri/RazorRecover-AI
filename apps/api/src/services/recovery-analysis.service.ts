import { RecoveryAnalysisResult } from '@razorrecover/shared-types';
import { PaymentRepository } from '../repositories/payment.repository';
import { OrderRepository } from '../repositories/order.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { MerchantRepository } from '../repositories/merchant.repository';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { DiagnosisService } from './diagnosis.service';
import { ScoringService } from './scoring.service';
import { AuditService } from './audit.service';

export interface AnalyzePaymentOptions {
  paymentId?: string;
  orderId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  correlationId?: string;
}

export class RecoveryAnalysisService {
  private paymentRepo = new PaymentRepository();
  private orderRepo = new OrderRepository();
  private customerRepo = new CustomerRepository();
  private merchantRepo = new MerchantRepository();
  private recoveryCaseRepo = new RecoveryCaseRepository();
  private diagnosisService = new DiagnosisService();
  private scoringService = new ScoringService();
  private auditService = new AuditService();

  public async analyzePayment(options: AnalyzePaymentOptions): Promise<RecoveryAnalysisResult> {
    const correlationId = options.correlationId || `corr_analysis_${Date.now()}`;

    // 1. Fetch Payment & Order Context
    let payment = options.paymentId ? await this.paymentRepo.findById(options.paymentId) : null;
    if (!payment && options.razorpayPaymentId) {
      payment = await this.paymentRepo.findByRazorpayPaymentId(options.razorpayPaymentId);
    }
    if (!payment && options.orderId) {
      payment = await this.paymentRepo.findByRazorpayOrderId(options.orderId);
    }
    if (!payment && options.razorpayOrderId) {
      payment = await this.paymentRepo.findByRazorpayOrderId(options.razorpayOrderId);
    }

    let order = payment?.razorpay_order_id
      ? await this.orderRepo.findByRazorpayOrderId(payment.razorpay_order_id)
      : null;

    if (!order && options.orderId) {
      order = await this.orderRepo.findById(options.orderId);
    }
    if (!order && options.razorpayOrderId) {
      order = await this.orderRepo.findByRazorpayOrderId(options.razorpayOrderId);
    }

    const merchantId = payment?.merchant_id || order?.merchant_id || 'mch_test_01';
    const merchant = await this.merchantRepo.findById(merchantId);
    const highValueThreshold = merchant?.high_value_threshold || ScoringService.DEFAULT_HIGH_VALUE_THRESHOLD;

    const customerId = payment?.customer_id || order?.customer_id;
    const customer = customerId ? await this.customerRepo.findById(customerId) : null;

    // 2. Determine Order & Captured Amounts (Integer Paise)
    const orderAmount = order?.amount || payment?.amount || 0;
    const capturedAmount = (payment?.status === 'CAPTURED' || order?.status === 'PAID')
      ? orderAmount
      : (payment?.captured_at ? payment.amount : 0);

    // 3. Fetch Recent Failure Statistics for Bank/Method
    const failureRates = await this.paymentRepo.getRecentFailureRates(payment?.bank, payment?.method);

    // 4. Run Deterministic Failure Diagnosis
    const diagnosis = this.diagnosisService.diagnose({
      paymentStatus: payment?.status,
      orderStatus: order?.status,
      capturedAmount,
      orderAmount,
      errorCode: payment?.error_code,
      errorDescription: payment?.error_description,
      errorSource: payment?.error_source,
      errorStep: payment?.error_step,
      errorReason: payment?.error_reason,
      method: payment?.method,
      bank: payment?.bank,
      failureCount: payment?.failure_count || (payment?.status === 'FAILED' ? 1 : 0),
      previousSuccessCount: customer?.successful_payment_count || 0,
      recentBankFailureRate: failureRates.bankFailureRate,
      recentMethodFailureRate: failureRates.methodFailureRate,
      isCheckoutAbandoned: order?.status === 'ABANDONED'
    });

    // 5. Run Deterministic Baseline Recovery Scoring
    const scoring = this.scoringService.calculate({
      orderAmount,
      capturedAmount,
      category: diagnosis.category,
      previousSuccessCount: customer?.successful_payment_count || 0,
      failureCount: payment?.failure_count || 1,
      recentBankFailureRate: failureRates.bankFailureRate,
      contactOptIn: customer?.contact_opt_in || false,
      highValueThreshold,
      createdAt: payment?.created_at || order?.created_at
    });

    const eligibleForRecovery =
      diagnosis.category !== 'ALREADY_CAPTURED' &&
      diagnosis.category !== 'UNKNOWN_OR_AMBIGUOUS' &&
      scoring.amountAtRisk > 0 &&
      scoring.recoveryProbability > 0;

    // 6. Create or Update RecoveryCase
    let existingCase = payment?.id
      ? await this.recoveryCaseRepo.findByPaymentId(payment.id)
      : null;

    if (!existingCase && order?.id) {
      existingCase = await this.recoveryCaseRepo.findByOrderId(order.id);
    }

    let recoveryCaseId: string | undefined;

    const caseData = {
      merchant_id: merchantId,
      order_id: order?.id || payment?.razorpay_order_id || `ord_${Date.now()}`,
      payment_id: payment?.id,
      case_type: (order?.status === 'ABANDONED' ? 'CHECKOUT_ABANDONMENT' : 'PAYMENT_FAILURE') as any,
      amount_at_risk: scoring.amountAtRisk,
      recoverability_score: scoring.recoveryProbability,
      expected_recovery_value: scoring.expectedRecoveryValue,
      diagnosis: JSON.stringify(diagnosis),
      diagnosis_confidence: diagnosis.confidence,
      priority_score: scoring.priorityScore,
      status: (eligibleForRecovery ? 'SCORED' : 'STOPPED') as any
    };

    if (existingCase) {
      const updated = await this.recoveryCaseRepo.updateDeterministicAnalysis(existingCase.id, {
        amount_at_risk: scoring.amountAtRisk,
        recoverability_score: scoring.recoveryProbability,
        expected_recovery_value: scoring.expectedRecoveryValue,
        diagnosis: JSON.stringify(diagnosis),
        diagnosis_confidence: diagnosis.confidence,
        priority_score: scoring.priorityScore,
        status: eligibleForRecovery ? 'SCORED' : 'STOPPED'
      });
      recoveryCaseId = updated?.id || existingCase.id;
    } else if (payment || order) {
      const created = await this.recoveryCaseRepo.create(caseData);
      recoveryCaseId = created?.id;
    }

    // 7. Audit Logging
    await this.auditService.logEvent({
      merchantId,
      recoveryCaseId: recoveryCaseId || 'system',
      eventType: 'deterministic_recovery_analysis_computed',
      action: 'compute_recovery_risk_and_score',
      inputSummary: `Analyzed payment=${payment?.id || 'none'} order=${order?.id || 'none'} amountAtRisk=${scoring.amountAtRisk}`,
      decisionSummary: `Diagnosed ${diagnosis.category} (conf: ${diagnosis.confidence}), probability: ${scoring.recoveryProbability}, expectedVal: ${scoring.expectedRecoveryValue}, priorityScore: ${scoring.priorityScore}`,
      outcome: eligibleForRecovery ? 'SCORED' : 'INELIGIBLE',
      correlationId
    });

    return {
      paymentId: payment?.id,
      orderId: order?.id || payment?.razorpay_order_id,
      merchantId,
      amountAtRisk: scoring.amountAtRisk,
      diagnosis,
      recoveryProbability: scoring.recoveryProbability,
      expectedRecoveryValue: scoring.expectedRecoveryValue,
      priorityScore: scoring.priorityScore,
      highValue: scoring.highValue,
      recoveryCaseId,
      eligibleForRecovery
    };
  }
}
