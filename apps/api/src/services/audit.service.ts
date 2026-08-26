import { AuditEvent, ActorType } from '@razorrecover/shared-types';
import { AuditEventRepository } from '../repositories/audit-event.repository';

export class AuditService {
  private repo = new AuditEventRepository();

  public async logEvent(data: {
    merchantId: string;
    recoveryCaseId?: string;
    eventType: string;
    actorType?: ActorType;
    actorId?: string;
    action: string;
    inputSummary?: string;
    decisionSummary?: string;
    policyResult?: string;
    outcome?: string;
    correlationId: string;
  }): Promise<AuditEvent> {
    const auditData: Partial<AuditEvent> = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      merchant_id: data.merchantId,
      recovery_case_id: data.recoveryCaseId || undefined,
      event_type: data.eventType,
      actor_type: data.actorType || 'system',
      actor_id: data.actorId || 'webhook_processor',
      action: data.action,
      input_summary: data.inputSummary,
      decision_summary: data.decisionSummary,
      policy_result: data.policyResult,
      outcome: data.outcome,
      timestamp: new Date().toISOString(),
      correlation_id: data.correlationId
    };

    try {
      return await this.repo.create(auditData);
    } catch (err: any) {
      console.warn('[AuditService] Database log fallback:', err.message);
      return auditData as AuditEvent;
    }
  }
}
