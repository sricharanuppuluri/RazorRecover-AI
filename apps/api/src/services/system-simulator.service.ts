import {
  SimulationScenario,
  SimulationScenarioResult,
  ScenarioType,
  AllowedAction,
  PolicyDecision,
} from '@razorrecover/shared-types';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { OrderRepository } from '../repositories/order.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { AuditEventRepository } from '../repositories/audit-event.repository';

export class SystemSimulatorService {
  private caseRepo = new RecoveryCaseRepository();
  private orderRepo = new OrderRepository();
  private paymentRepo = new PaymentRepository();
  private customerRepo = new CustomerRepository();
  private auditRepo = new AuditEventRepository();

  public getAvailableScenarios(): SimulationScenario[] {
    return [
      {
        id: 'BANK_DEGRADATION',
        title: 'Temporary HDFC Bank Degradation',
        description: 'Simulates a 45% failure spike on HDFC UPI payments triggering automated wait & alternate payment guidance.',
        defaultAmount: 750000, // ₹7,500 in paise
        expectedDiagnosis: 'temporary_bank_degradation',
        expectedAction: 'OFFER_ALTERNATE_PAYMENT',
      },
      {
        id: 'AUTH_FAILURE',
        title: 'Customer OTP / 3DS Authentication Failure',
        description: 'Simulates customer checkout OTP timeout and issues safe recovery link.',
        defaultAmount: 250000, // ₹2,500 in paise
        expectedDiagnosis: 'customer_authentication_issue',
        expectedAction: 'SEND_RECOVERY_LINK',
      },
      {
        id: 'ABANDONED_CHECKOUT',
        title: 'High-Intent Abandoned Checkout',
        description: 'Detects cart abandonment after 15 minutes of inactivity and sends personalized reminder.',
        defaultAmount: 1200000, // ₹12,000 in paise
        expectedDiagnosis: 'checkout_abandonment',
        expectedAction: 'SEND_REMINDER',
      },
      {
        id: 'SUBSCRIPTION_RECURRING',
        title: 'Recurring Subscription Mandate Failure',
        description: 'Simulates insufficient funds on monthly SaaS mandate and schedules intelligent retry.',
        defaultAmount: 149900, // ₹1,499 in paise
        expectedDiagnosis: 'insufficient_funds',
        expectedAction: 'WAIT_AND_RETRY',
      },
      {
        id: 'VOICE_RECOVERY',
        title: 'Hinglish Interactive Voice Recovery Call',
        description: 'Initiates automated voice assistant call for high-value payment recovery.',
        defaultAmount: 1850000, // ₹18,500 in paise
        expectedDiagnosis: 'temporary_bank_degradation',
        expectedAction: 'VOICE_ASSISTANT_CALL',
      },
    ];
  }

  public async executeScenario(
    merchantId: string,
    scenarioId: ScenarioType,
    customAmount?: number
  ): Promise<SimulationScenarioResult> {
    const scenario = this.getAvailableScenarios().find((s) => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`Invalid simulation scenario ID: ${scenarioId}`);
    }

    const amount = customAmount || scenario.defaultAmount;
    const timestamp = Date.now();
    const orderId = `ord_sim_${scenarioId.toLowerCase()}_${timestamp}`;
    const paymentId = `pay_sim_${scenarioId.toLowerCase()}_${timestamp}`;
    const caseId = `rc_sim_${scenarioId.toLowerCase()}_${timestamp}`;
    const customerId = `cust_sim_${timestamp}`;

    // 1. Create customer
    await this.customerRepo.create({
      id: customerId,
      merchant_id: merchantId,
      external_customer_id: `ext_${customerId}`,
      email_hash: 'hash_sim_email',
      phone_hash: 'hash_sim_phone',
      first_seen_at: new Date().toISOString(),
      successful_payment_count: 2,
      failed_payment_count: 1,
      total_success_value: 1000000,
      total_failed_value: amount,
      contact_opt_in: true,
      risk_flags: [],
    });

    // 2. Create order
    await this.orderRepo.create({
      id: orderId,
      merchant_id: merchantId,
      razorpay_order_id: `rzp_ord_${orderId}`,
      customer_id: customerId,
      amount,
      currency: 'INR',
      status: 'CREATED',
      product_category: 'SIMULATED_DEMO_RECOVERY',
      created_at: new Date().toISOString(),
    });

    // 3. Create payment failure
    await this.paymentRepo.create({
      id: paymentId,
      merchant_id: merchantId,
      razorpay_payment_id: `rzp_pay_${paymentId}`,
      razorpay_order_id: `rzp_ord_${orderId}`,
      customer_id: customerId,
      amount,
      currency: 'INR',
      method: 'upi',
      bank: 'HDFC',
      status: 'FAILED',
      error_code: 'BAD_REQUEST_ERROR',
      error_description: 'Payment failed due to temporary bank issues',
      error_source: 'bank',
      error_step: 'payment_authentication',
      error_reason: 'payment_failed',
      created_at: new Date().toISOString(),
      failure_count: 1,
    });

    // 4. Create recovery case
    const recoveryCase = await this.caseRepo.create({
      id: caseId,
      merchant_id: merchantId,
      order_id: orderId,
      payment_id: paymentId,
      case_type: 'PAYMENT_FAILURE',
      amount_at_risk: amount,
      recoverability_score: 0.88,
      expected_recovery_value: Math.round(amount * 0.88),
      diagnosis: scenario.expectedDiagnosis,
      diagnosis_confidence: 0.92,
      recommended_action: scenario.expectedAction as AllowedAction,
      action_confidence: 0.9,
      policy_decision: 'APPROVED',
      status: 'ACTION_SENT',
      retry_count: 1,
      notification_count: 1,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });

    // 5. Write audit record
    await this.auditRepo.create({
      merchant_id: merchantId,
      recovery_case_id: caseId,
      event_type: 'SYSTEM_SIMULATION_EXECUTED',
      actor_type: 'system',
      actor_id: 'scenario_simulator',
      action: `SIMULATE_${scenarioId}`,
      decision_summary: `Executed scenario '${scenario.title}' for ₹${(amount / 100).toLocaleString('en-IN')}`,
      outcome: 'APPROVED',
    });

    return {
      scenarioId,
      merchantId,
      orderId,
      paymentId,
      recoveryCaseId: caseId,
      diagnosis: scenario.expectedDiagnosis,
      aiRecommendation: scenario.expectedAction,
      policyDecision: 'ALLOWED',
      actionExecuted: scenario.expectedAction,
      caseStatus: recoveryCase.status,
      executedAt: new Date().toISOString(),
    };
  }
}
