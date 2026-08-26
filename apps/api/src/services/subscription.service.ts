import { SubscriptionFailure } from '@razorrecover/shared-types';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { AuditEventRepository } from '../repositories/audit-event.repository';

export class SubscriptionService {
  private subRepo = new SubscriptionRepository();
  private caseRepo = new RecoveryCaseRepository();
  private auditRepo = new AuditEventRepository();

  public async recordFailure(
    merchantId: string,
    subscriptionId: string,
    customerId: string,
    amount: number,
    planName: string,
    failureReason: string
  ): Promise<{ subscriptionFailure: SubscriptionFailure; recoveryCaseId: string }> {
    const id = `sub_fail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const failure: SubscriptionFailure = {
      id,
      merchantId,
      subscriptionId,
      customerId,
      amount,
      planName,
      failureReason,
      retryCount: 1,
      status: 'FAILED',
      lastAttemptAt: new Date().toISOString(),
      nextRetryAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    };

    await this.subRepo.create(failure);

    // Create Recovery Case for Subscription Failure
    const caseId = `rc_sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await this.caseRepo.create({
      id: caseId,
      merchant_id: merchantId,
      order_id: `ord_sub_${subscriptionId}`,
      payment_id: `pay_sub_${id}`,
      case_type: 'SUBSCRIPTION_FAILURE',
      amount_at_risk: amount,
      recoverability_score: 0.88,
      expected_recovery_value: Math.round(amount * 0.88),
      diagnosis: 'subscription_mandate_failure',
      diagnosis_confidence: 0.92,
      recommended_action: 'WAIT_AND_RETRY',
      action_confidence: 0.89,
      policy_decision: 'APPROVED',
      status: 'NEW',
      retry_count: 1,
      notification_count: 0,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });

    await this.subRepo.update(id, { recoveryCaseId: caseId });

    await this.auditRepo.create({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      merchant_id: merchantId,
      recovery_case_id: caseId,
      event_type: 'SUBSCRIPTION_RECOVERY_TRIGGERED',
      actor_type: 'system',
      actor_id: 'subscription_engine',
      action: 'INGEST_RECURRING_FAILURE',
      input_summary: JSON.stringify({ subscriptionId, amount, planName, failureReason }),
      decision_summary: 'Subscription failure ingested and recovery case initialized',
      policy_result: JSON.stringify({ allowed: true }),
      outcome: 'CASE_CREATED',
      timestamp: new Date().toISOString(),
      correlation_id: subscriptionId,
    });

    const updatedSub = (await this.subRepo.findById(id))!;
    return { subscriptionFailure: updatedSub, recoveryCaseId: caseId };
  }

  public async getFailures(merchantId: string): Promise<SubscriptionFailure[]> {
    return this.subRepo.findByMerchant(merchantId);
  }
}
