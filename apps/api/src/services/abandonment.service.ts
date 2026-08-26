import { CheckoutSession, CheckoutSessionStatus } from '@razorrecover/shared-types';
import { CheckoutSessionRepository } from '../repositories/checkout-session.repository';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { AuditEventRepository } from '../repositories/audit-event.repository';

export class AbandonmentService {
  private checkoutRepo = new CheckoutSessionRepository();
  private caseRepo = new RecoveryCaseRepository();
  private auditRepo = new AuditEventRepository();

  public async createSession(
    merchantId: string,
    orderId: string,
    customerId: string,
    amount: number,
    currency = 'INR'
  ): Promise<CheckoutSession> {
    const id = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const session: CheckoutSession = {
      id,
      merchantId,
      orderId,
      customerId,
      amount,
      currency,
      status: 'STARTED',
      startedAt: new Date().toISOString(),
    };

    const created = await this.checkoutRepo.create(session);

    await this.auditRepo.create({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      merchant_id: merchantId,
      recovery_case_id: '',
      event_type: 'CHECKOUT_SESSION_STARTED',
      actor_type: 'customer',
      actor_id: customerId,
      action: 'CHECKOUT_START',
      input_summary: JSON.stringify({ orderId, amount, currency }),
      decision_summary: 'Checkout session initialized',
      policy_result: JSON.stringify({ allowed: true }),
      outcome: 'STARTED',
      timestamp: new Date().toISOString(),
      correlation_id: id,
    });

    return created;
  }

  public async updateSessionStatus(
    merchantId: string,
    sessionId: string,
    status: CheckoutSessionStatus
  ): Promise<CheckoutSession> {
    const session = await this.checkoutRepo.findById(sessionId);
    if (!session) {
      throw new Error('Checkout session not found');
    }
    if (session.merchantId !== merchantId) {
      throw new Error('Unauthorized access to checkout session');
    }

    const updates: Partial<CheckoutSession> = { status };
    if (status === 'PAYMENT_ATTEMPTED') {
      updates.lastAttemptAt = new Date().toISOString();
    } else if (status === 'ABANDONED') {
      updates.abandonedAt = new Date().toISOString();
    }

    const updated = await this.checkoutRepo.update(sessionId, updates);
    return updated!;
  }

  public async detectAndRecoverAbandonedSessions(
    merchantId: string,
    timeoutMinutes = 15
  ): Promise<{ detectedCount: number; recoveryCasesCreated: string[] }> {
    const sessions = await this.checkoutRepo.findByMerchant(merchantId);
    const now = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const recoveryCasesCreated: string[] = [];

    for (const session of sessions) {
      if (session.status === 'STARTED' || session.status === 'PAYMENT_ATTEMPTED') {
        const startTime = new Date(session.startedAt).getTime();
        if (now - startTime >= timeoutMs) {
          // Mark session as ABANDONED
          await this.checkoutRepo.update(session.id, {
            status: 'ABANDONED',
            abandonedAt: new Date().toISOString(),
          });

          // Create recovery case for checkout abandonment
          const caseId = `rc_ab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const recoveryCase = await this.caseRepo.create({
            id: caseId,
            merchant_id: merchantId,
            order_id: session.orderId,
            payment_id: `pay_ab_${session.id}`,
            case_type: 'CHECKOUT_ABANDONMENT',
            amount_at_risk: session.amount,
            recoverability_score: 0.72,
            expected_recovery_value: Math.round(session.amount * 0.72),
            diagnosis: 'checkout_abandonment',
            diagnosis_confidence: 0.85,
            recommended_action: 'SEND_RECOVERY_LINK',
            action_confidence: 0.80,
            policy_decision: 'APPROVED',
            status: 'NEW',
            retry_count: 0,
            notification_count: 0,
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          });

          await this.checkoutRepo.update(session.id, { recoveryCaseId: caseId });
          recoveryCasesCreated.push(caseId);

          await this.auditRepo.create({
            id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            merchant_id: merchantId,
            recovery_case_id: caseId,
            event_type: 'ABANDONMENT_RECOVERY_TRIGGERED',
            actor_type: 'system',
            actor_id: 'abandonment_job',
            action: 'TRIGGER_RECOVERY',
            input_summary: JSON.stringify({ sessionId: session.id, amount: session.amount }),
            decision_summary: 'Checkout abandonment recovery case created',
            policy_result: JSON.stringify({ allowed: true }),
            outcome: 'CASE_CREATED',
            timestamp: new Date().toISOString(),
            correlation_id: session.id,
          });
        }
      }
    }

    return {
      detectedCount: recoveryCasesCreated.length,
      recoveryCasesCreated,
    };
  }

  public async getSessions(merchantId: string): Promise<CheckoutSession[]> {
    return this.checkoutRepo.findByMerchant(merchantId);
  }
}
