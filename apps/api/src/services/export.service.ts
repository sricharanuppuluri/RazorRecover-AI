import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { AuditEventRepository } from '../repositories/audit-event.repository';
import { RecoveryCase, AuditEvent } from '@razorrecover/shared-types';

export class ExportService {
  private caseRepo = new RecoveryCaseRepository();
  private auditRepo = new AuditEventRepository();

  public async exportCasesCsv(merchantId: string): Promise<string> {
    const cases: RecoveryCase[] = await this.caseRepo.findAllByMerchant(merchantId);
    const headers = [
      'Case ID',
      'Merchant ID',
      'Order ID',
      'Case Type',
      'Amount at Risk (INR)',
      'Recoverability Score',
      'Status',
      'Retry Count',
      'Notification Count',
      'Created At',
    ];

    const rows = cases.map((c: RecoveryCase) => [
      c.id,
      c.merchant_id,
      c.order_id,
      c.case_type,
      (c.amount_at_risk / 100).toFixed(2),
      c.recoverability_score ? c.recoverability_score.toFixed(2) : '0.00',
      c.status,
      c.retry_count,
      c.notification_count,
      c.started_at,
    ]);

    return [headers.join(','), ...rows.map((r: any[]) => r.map((cell: any) => `"${cell}"`).join(','))].join('\n');
  }

  public async exportAuditCsv(merchantId: string): Promise<string> {
    const auditEvents: AuditEvent[] = await this.auditRepo.listByMerchant(merchantId);
    const headers = [
      'Event ID',
      'Merchant ID',
      'Case ID',
      'Event Type',
      'Actor Type',
      'Actor ID',
      'Action',
      'Policy Result',
      'Outcome',
      'Timestamp',
    ];

    const rows = auditEvents.map((a: AuditEvent) => [
      a.id,
      a.merchant_id,
      a.recovery_case_id || '',
      a.event_type,
      a.actor_type,
      a.actor_id,
      a.action,
      a.policy_result || '',
      a.outcome || '',
      a.timestamp,
    ]);

    return [headers.join(','), ...rows.map((r: any[]) => r.map((cell: any) => `"${cell}"`).join(','))].join('\n');
  }
}
