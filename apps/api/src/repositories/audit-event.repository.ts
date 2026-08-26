import { AuditEvent } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class AuditEventRepository {
  public async create(event: Partial<AuditEvent>): Promise<AuditEvent> {
    const pool = getDbPool();
    const query = `
      INSERT INTO audit_events (
        id, merchant_id, recovery_case_id, event_type, actor_type, actor_id,
        action, input_summary, decision_summary, policy_result, outcome, timestamp, correlation_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12)
      RETURNING *;
    `;
    const values = [
      event.id,
      event.merchant_id,
      event.recovery_case_id || null,
      event.event_type,
      event.actor_type || 'system',
      event.actor_id || 'webhook_processor',
      event.action,
      event.input_summary || null,
      event.decision_summary || null,
      event.policy_result || null,
      event.outcome || null,
      event.correlation_id || `corr_${Date.now()}`
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }
}
