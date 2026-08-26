import {
  AIDecisionPipelineResult,
  AIInputContext,
  RecoveryCase
} from '@razorrecover/shared-types';
import { PolicyEngine } from '@razorrecover/policy-engine';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { OrderRepository } from '../repositories/order.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { MerchantRepository } from '../repositories/merchant.repository';
import { PolicyDecisionRepository } from '../repositories/policy-decision.repository';
import { RecoveryAnalysisService } from './recovery-analysis.service';
import { AIDecisionService } from './ai/ai-decision.service';
import { AuditService } from './audit.service';
import { AIProvider } from './ai/ai-provider';

export class AIPolicyPipelineService {
  private recoveryCaseRepo = new RecoveryCaseRepository();
  private orderRepo = new OrderRepository();
  private paymentRepo = new PaymentRepository();
  private customerRepo = new CustomerRepository();
  private merchantRepo = new MerchantRepository();
  private policyDecisionRepo = new PolicyDecisionRepository();
  private analysisService = new RecoveryAnalysisService();
  private aiDecisionService = new AIDecisionService();
  private policyEngine = new PolicyEngine();
  private auditService = new AuditService();

  public async processCaseAIDecision(
    caseId: string,
    customAIProvider?: AIProvider
  ): Promise<AIDecisionPipelineResult> {
    // 1. Fetch RecoveryCase
    const recoveryCase = await this.recoveryCaseRepo.findById(caseId);
    if (!recoveryCase) {
      throw new Error(`RecoveryCase with ID ${caseId} not found`);
    }

    // 2. Fetch associated entities
    const order = await this.orderRepo.findById(recoveryCase.order_id);
    const payment = recoveryCase.payment_id ? await this.paymentRepo.findById(recoveryCase.payment_id) : null;
    const merchant = await this.merchantRepo.findById(recoveryCase.merchant_id);
    const customer = order ? await this.customerRepo.findById(order.customer_id) : null;

    if (!order) {
      throw new Error(`Associated Order ${recoveryCase.order_id} not found`);
    }

    // 3. Run / Retrieve Phase 4 Deterministic Analysis
    const analysis = await this.analysisService.analyzePayment({
      paymentId: payment?.id,
      orderId: order.id,
      razorpayOrderId: order.razorpay_order_id,
      razorpayPaymentId: payment?.razorpay_payment_id
    });

    // 4. Construct Structured AI Context (Secrets and raw credentials excluded)
    const context: AIInputContext = {
      merchant: {
        id: merchant?.id || recoveryCase.merchant_id,
        currency: merchant?.currency || order.currency || 'INR',
        policyProfileId: merchant?.policy_profile_id || 'pol_default',
        highValueThreshold: merchant?.high_value_threshold || 10000000
      },
      customer: {
        successfulPaymentCount: customer?.successful_payment_count || 0,
        failedPaymentCount: customer?.failed_payment_count || 0,
        contactOptIn: customer?.contact_opt_in !== undefined ? customer.contact_opt_in : true,
        totalSuccessValue: customer?.total_success_value || 0
      },
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        productCategory: order.product_category,
        createdAt: order.created_at
      },
      payment: payment
        ? {
            id: payment.id,
            method: payment.method,
            bank: payment.bank,
            status: payment.status,
            errorCode: payment.error_code,
            errorDescription: payment.error_description,
            errorSource: payment.error_source,
            errorStep: payment.error_step,
            errorReason: payment.error_reason,
            failureCount: payment.failure_count
          }
        : undefined,
      analysis: analysis
    };

    // 5. Generate and Persist AI Decision
    const aiDecisionRecord = await this.aiDecisionService.generateAndPersistDecision(
      context,
      recoveryCase.id,
      customAIProvider
    );

    // 6. Evaluate Deterministic Policy Engine
    const policyResult = this.policyEngine.evaluate({
      aiDecision: {
        diagnosis: aiDecisionRecord.diagnosis,
        recoveryProbability: aiDecisionRecord.recovery_probability,
        recommendedAction: aiDecisionRecord.recommended_action,
        rationale: aiDecisionRecord.rationale,
        confidence: aiDecisionRecord.confidence
      },
      deterministicAnalysis: analysis,
      merchantPolicy: {
        id: merchant?.policy_profile_id || 'pol_default',
        merchant_id: merchant?.id || recoveryCase.merchant_id,
        high_value_threshold: merchant?.high_value_threshold || 10000000
      },
      customer: {
        contact_opt_in: customer?.contact_opt_in !== undefined ? customer.contact_opt_in : true
      },
      order: { status: order.status },
      payment: { status: payment?.status },
      recoveryCase: {
        status: recoveryCase.status,
        retry_count: recoveryCase.retry_count,
        notification_count: recoveryCase.notification_count,
        expires_at: recoveryCase.expires_at
      }
    });

    // 7. Persist Policy Decision
    const policyDecisionRecord = await this.policyDecisionRepo.create({
      recovery_case_id: recoveryCase.id,
      action: policyResult.action,
      allowed: policyResult.allowed,
      reasons: policyResult.reasons,
      violated_rules: policyResult.violatedRules,
      requires_human: policyResult.requiresHuman,
      policy_version: policyResult.policyVersion
    });

    // 8. Update Recovery Case state (Status transition only, NO financial action executed)
    const newStatus: RecoveryCase['status'] = policyResult.allowed
      ? 'AI_RECOMMENDED'
      : policyResult.requiresHuman
      ? 'HUMAN_REVIEW'
      : 'SCORED';

    await this.recoveryCaseRepo.updateDeterministicAnalysis(recoveryCase.id, {
      amount_at_risk: analysis.amountAtRisk,
      recoverability_score: analysis.recoveryProbability,
      expected_recovery_value: analysis.expectedRecoveryValue,
      diagnosis: analysis.diagnosis.category,
      diagnosis_confidence: analysis.diagnosis.confidence,
      priority_score: analysis.priorityScore,
      status: newStatus
    });

    // 9. Audit Event for Policy Evaluation
    await this.auditService.logEvent({
      merchantId: recoveryCase.merchant_id,
      recoveryCaseId: recoveryCase.id,
      eventType: 'POLICY_EVALUATION_COMPLETED',
      actorType: 'system',
      action: 'EVALUATE_POLICY',
      inputSummary: `AI_Action:${aiDecisionRecord.recommended_action}, Diag:${aiDecisionRecord.diagnosis}`,
      decisionSummary: `Policy:${policyResult.allowed ? 'ALLOW' : policyResult.requiresHuman ? 'ESCALATE' : 'DENY'}, Reasons:[${policyResult.reasons.join(',')}]`,
      policyResult: policyResult.allowed ? 'APPROVED' : policyResult.requiresHuman ? 'HUMAN_REQUIRED' : 'DENIED',
      outcome: policyResult.action,
      correlationId: `corr_pol_${Date.now()}`
    });

    // 10. Return Structured Pipeline Result (NO financial/customer action executed)
    return {
      recoveryCaseId: recoveryCase.id,
      deterministicAnalysis: analysis,
      aiDecision: {
        id: aiDecisionRecord.id,
        model: aiDecisionRecord.model,
        promptVersion: aiDecisionRecord.prompt_version,
        inputContextHash: aiDecisionRecord.input_context_hash,
        diagnosis: aiDecisionRecord.diagnosis,
        recoveryProbability: aiDecisionRecord.recovery_probability,
        recommendedAction: aiDecisionRecord.recommended_action,
        rationale: aiDecisionRecord.rationale,
        confidence: aiDecisionRecord.confidence,
        createdAt: aiDecisionRecord.created_at
      },
      policyDecision: {
        id: policyDecisionRecord.id,
        action: policyDecisionRecord.action,
        allowed: policyDecisionRecord.allowed,
        reasons: policyDecisionRecord.reasons,
        violatedRules: policyDecisionRecord.violated_rules,
        requiresHuman: policyDecisionRecord.requires_human,
        policyVersion: policyDecisionRecord.policy_version,
        createdAt: policyDecisionRecord.created_at
      }
    };
  }
}
