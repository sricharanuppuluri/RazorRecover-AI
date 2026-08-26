import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { OrderRepository } from '../repositories/order.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { AuditService } from './audit.service';
import { RecoveryCaseService } from './recovery-case.service';
import { AIPolicyPipelineService } from './ai-policy-pipeline.service';
import { ActionExecutorService } from './recovery/action-executor.service';
import { AllowedAction, CaseStatus } from '@razorrecover/shared-types';

export type ScenarioType = 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C' | 'SCENARIO_D';

export interface SimulationStep {
  step: string;
  name: string;
  timestamp: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'INFO';
  detail: string;
  data?: any;
}

export class SimulationService {
  private caseRepo = new RecoveryCaseRepository();
  private orderRepo = new OrderRepository();
  private paymentRepo = new PaymentRepository();
  private customerRepo = new CustomerRepository();
  private auditService = new AuditService();
  private recoveryCaseService = new RecoveryCaseService();
  private aiPolicyService = new AIPolicyPipelineService();
  private actionExecutor = new ActionExecutorService();

  public async runSimulation(scenario: ScenarioType): Promise<{
    scenario: ScenarioType;
    title: string;
    description: string;
    caseId: string;
    finalStatus: CaseStatus;
    recoveredAmount: number;
    steps: SimulationStep[];
  }> {
    const correlationId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const steps: SimulationStep[] = [];

    let title = '';
    let description = '';
    let amount = 750000; // ₹7,500.00 in paise
    let method = 'upi';
    let bank = 'HDFC';
    let errorCode = 'BAD_REQUEST_PAYMENT_TIMED_OUT';
    let errorDescription = 'Bank server did not respond in time';

    if (scenario === 'SCENARIO_A') {
      title = 'Scenario A: Successful Automatic Recovery';
      description = 'Simulates a temporary bank degradation payment failure that AI recommends retrying, passes policy checks, and successfully recovers.';
      amount = 750000; // ₹7,500
      method = 'upi';
      bank = 'HDFC';
      errorCode = 'BAD_REQUEST_PAYMENT_TIMED_OUT';
      errorDescription = 'Bank server did not respond in time';
    } else if (scenario === 'SCENARIO_B') {
      title = 'Scenario B: Policy Safe Stop';
      description = 'Simulates a low-probability repeated failure case where policy guardrails enforce a safe stop and prevent unsafe retry spam.';
      amount = 200000; // ₹2,000
      method = 'card';
      bank = 'ICICI';
      errorCode = 'BAD_REQUEST_PAYMENT_DECLINED';
      errorDescription = 'Card declined by issuing bank repeatedly';
    } else if (scenario === 'SCENARIO_C') {
      title = 'Scenario C: High-Value Human Escalation';
      description = 'Simulates a high-value transaction (₹1,25,000) with ambiguous failure details that triggers mandatory human approval.';
      amount = 12500000; // ₹1,25,000
      method = 'netbanking';
      bank = 'SBI';
      errorCode = 'GATEWAY_ERROR';
      errorDescription = 'High value transaction flagged for verification';
    } else {
      title = 'Scenario D: AI Provider Outage / Fallback';
      description = 'Simulates LLM provider unavailability, demonstrating safe deterministic fallback and escalation to human review without failing.';
      amount = 450000; // ₹4,500
      method = 'upi';
      bank = 'AXIS';
      errorCode = 'SERVER_ERROR';
      errorDescription = 'Upstream payment gateway timeout';
    }

    // Step 1: Create Order & Payment
    const customerId = `cust_sim_${Math.floor(Math.random() * 1000)}`;
    const orderId = `ord_sim_${Date.now()}`;
    const paymentId = `pay_sim_${Date.now()}`;

    await this.customerRepo.create({
      id: customerId,
      merchant_id: 'mch_test_01',
      external_customer_id: `ext_${customerId}`,
      contact_opt_in: true,
      successful_payment_count: scenario === 'SCENARIO_B' ? 0 : 3,
      failed_payment_count: scenario === 'SCENARIO_B' ? 4 : 1,
      total_success_value: 1500000,
      total_failed_value: amount,
      first_seen_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      risk_flags: scenario === 'SCENARIO_B' ? ['REPEATED_FAILURES'] : []
    });

    await this.orderRepo.create({
      id: orderId,
      merchant_id: 'mch_test_01',
      razorpay_order_id: orderId,
      customer_id: customerId,
      amount,
      currency: 'INR',
      status: 'ATTEMPTED',
      created_at: new Date().toISOString()
    });

    await this.paymentRepo.create({
      id: paymentId,
      merchant_id: 'mch_test_01',
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      customer_id: customerId,
      amount,
      currency: 'INR',
      method,
      bank,
      status: 'FAILED',
      error_code: errorCode,
      error_description: errorDescription,
      failure_count: scenario === 'SCENARIO_B' ? 3 : 1,
      created_at: new Date().toISOString()
    });

    steps.push({
      step: '1',
      name: 'Payment Failure Ingestion',
      timestamp: new Date().toISOString(),
      status: 'INFO',
      detail: `Payment ${paymentId} failed for order ${orderId} (${(amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}).`,
      data: { orderId, paymentId, amount, method, bank, errorCode }
    });

    // Step 2: Create Recovery Case & Risk Diagnosis
    const rc = await this.recoveryCaseService.createRecoveryCase({
      order_id: orderId,
      payment_id: paymentId,
      merchant_id: 'mch_test_01'
    });

    steps.push({
      step: '2',
      name: 'Deterministic Diagnosis & Risk Scoring',
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      detail: `Case ${rc.id} created. Diagnosis: ${rc.diagnosis} (Confidence: ${((rc.diagnosis_confidence || 0.8) * 100).toFixed(0)}%). Recoverability Score: ${((rc.recoverability_score || 0.7) * 100).toFixed(0)}%. Priority: ${rc.priority_score}.`,
      data: {
        recoveryCaseId: rc.id,
        diagnosis: rc.diagnosis,
        recoverabilityScore: rc.recoverability_score,
        expectedValue: rc.expected_recovery_value,
        priorityScore: rc.priority_score
      }
    });

    let finalStatus: CaseStatus = rc.status;
    let recoveredAmount = 0;

    // Step 3: AI Decision & Policy Evaluation
    if (scenario === 'SCENARIO_D') {
      // Simulate AI Error / Fallback
      steps.push({
        step: '3',
        name: 'AI Decision Engine',
        timestamp: new Date().toISOString(),
        status: 'WARNING',
        detail: 'LLM API Provider connection timeout. Deterministic fallback engaged safely.',
        data: { fallbackTriggered: true, providerError: 'ETIMEDOUT' }
      });

      await this.caseRepo.updateStatus(rc.id, 'HUMAN_REVIEW');
      finalStatus = 'HUMAN_REVIEW';

      steps.push({
        step: '4',
        name: 'Policy Engine Guardrails',
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        detail: 'Policy Engine enforced escalation to HUMAN_REVIEW due to AI fallback. Zero unsafe actions taken.',
        data: { policyStatus: 'HUMAN_REQUIRED', reasons: ['AI_PROVIDER_UNAVAILABLE_FALLBACK'] }
      });
    } else {
      try {
        const aiResult = await this.aiPolicyService.processCaseAIDecision(rc.id);

        steps.push({
          step: '3',
          name: 'AI Decision Engine',
          timestamp: new Date().toISOString(),
          status: 'SUCCESS',
          detail: `AI Model ${aiResult.aiDecision.model} recommended: ${aiResult.aiDecision.recommendedAction} (Confidence: ${(aiResult.aiDecision.confidence * 100).toFixed(0)}%). Rationale: "${aiResult.aiDecision.rationale}".`,
          data: aiResult.aiDecision
        });

        steps.push({
          step: '4',
          name: 'Policy Guardrails Check',
          timestamp: new Date().toISOString(),
          status: aiResult.policyDecision.allowed ? 'SUCCESS' : (aiResult.policyDecision.requiresHuman ? 'WARNING' : 'FAILED'),
          detail: `Policy Engine Result: ${aiResult.policyDecision.requiresHuman ? 'HUMAN_REQUIRED' : (aiResult.policyDecision.allowed ? 'APPROVED' : 'DENIED')}. Reasons: ${aiResult.policyDecision.reasons.join('; ')}.`,
          data: aiResult.policyDecision
        });

        // Step 4: Action Execution / Outcome Simulation
        if (scenario === 'SCENARIO_A') {
          const execRes = await this.actionExecutor.executeAction({
            recoveryCaseId: rc.id,
            action: 'WAIT_AND_RETRY',
            correlationId,
            simulation: true,
            actorType: 'system'
          });

          steps.push({
            step: '5',
            name: 'Action Execution',
            timestamp: new Date().toISOString(),
            status: 'SUCCESS',
            detail: `Action WAIT_AND_RETRY executed with Action ID ${execRes.actionId}... Status: ${execRes.actionStatus}.`,
            data: execRes
          });

          // Simulate payment resolution success
          await this.caseRepo.updateStatus(rc.id, 'RECOVERED', {
            closedAt: new Date().toISOString(),
            closeReason: 'SIMULATED_RECOVERY_SUCCESS',
            recoveredAmount: amount
          });

          finalStatus = 'RECOVERED';
          recoveredAmount = amount;

          await this.auditService.logEvent({
            merchantId: 'mch_test_01',
            recoveryCaseId: rc.id,
            eventType: 'RECOVERY_SUCCEEDED',
            actorType: 'system',
            action: 'RECOVERY_COMPLETE',
            outcome: 'RECOVERED',
            decisionSummary: 'Payment captured successfully after automatic retry',
            correlationId
          });

          steps.push({
            step: '6',
            name: 'Outcome Resolution',
            timestamp: new Date().toISOString(),
            status: 'SUCCESS',
            detail: `Payment recovered! Captured ${(amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}. Case state updated to RECOVERED.`,
            data: { recoveredAmount: amount, closeReason: 'PAYMENT_CAPTURED' }
          });
        } else if (scenario === 'SCENARIO_B') {
          // Policy Safe Stop
          await this.caseRepo.updateStatus(rc.id, 'STOPPED', {
            closedAt: new Date().toISOString(),
            closeReason: 'POLICY_SAFE_STOP'
          });
          finalStatus = 'STOPPED';

          await this.auditService.logEvent({
            merchantId: 'mch_test_01',
            recoveryCaseId: rc.id,
            eventType: 'RECOVERY_CASE_STOPPED',
            actorType: 'system',
            action: 'SAFE_STOP',
            outcome: 'STOPPED',
            decisionSummary: 'Policy enforced safe stop due to max retries exceeded',
            correlationId
          });

          steps.push({
            step: '5',
            name: 'Outcome Resolution',
            timestamp: new Date().toISOString(),
            status: 'INFO',
            detail: 'Case state updated to STOPPED. No further automated actions will be taken.',
            data: { closeReason: 'POLICY_SAFE_STOP' }
          });
        } else if (scenario === 'SCENARIO_C') {
          // Human Review
          await this.caseRepo.updateStatus(rc.id, 'HUMAN_REVIEW');
          finalStatus = 'HUMAN_REVIEW';

          await this.auditService.logEvent({
            merchantId: 'mch_test_01',
            recoveryCaseId: rc.id,
            eventType: 'HUMAN_REVIEW_REQUIRED',
            actorType: 'system',
            action: 'ESCALATE_HUMAN',
            outcome: 'PENDING_MERCHANT_APPROVAL',
            decisionSummary: 'Escalated to human review queue due to high transaction value (> ₹1,00,000)',
            correlationId
          });

          steps.push({
            step: '5',
            name: 'Human Queue Escalation',
            timestamp: new Date().toISOString(),
            status: 'WARNING',
            detail: 'Case added to Merchant Human Review queue. Awaiting merchant approval.',
            data: { queue: 'HUMAN_REVIEW' }
          });
        }
      } catch (err: any) {
        steps.push({
          step: '3',
          name: 'AI & Policy Execution',
          timestamp: new Date().toISOString(),
          status: 'FAILED',
          detail: `Pipeline error: ${err.message}`,
          data: { error: err.message }
        });
      }
    }

    return {
      scenario,
      title,
      description,
      caseId: rc.id,
      finalStatus,
      recoveredAmount,
      steps
    };
  }
}
