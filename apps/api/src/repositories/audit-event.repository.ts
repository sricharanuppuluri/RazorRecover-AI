import { AuditEvent } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class AuditEventRepository {
  private static memoryStore: AuditEvent[] = [];

  public async create(event: Partial<AuditEvent>): Promise<AuditEvent> {
    const record: AuditEvent = {
      id: event.id || `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      merchant_id: event.merchant_id || 'mch_test_01',
      recovery_case_id: event.recovery_case_id || '',
      event_type: event.event_type || 'SYSTEM_EVENT',
      actor_type: event.actor_type || 'system',
      actor_id: event.actor_id || 'system',
      action: event.action || 'LOG_EVENT',
      input_summary: event.input_summary,
      decision_summary: event.decision_summary,
      policy_result: event.policy_result,
      outcome: event.outcome,
      timestamp: event.timestamp || new Date().toISOString(),
      correlation_id: event.correlation_id || `corr_${Date.now()}`
    };

    AuditEventRepository.memoryStore.unshift(record);

    try {
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
        record.id,
        record.merchant_id,
        record.recovery_case_id || null,
        record.event_type,
        record.actor_type,
        record.actor_id,
        record.action,
        record.input_summary || null,
        record.decision_summary || null,
        record.policy_result || null,
        record.outcome || null,
        record.correlation_id
      ];

      const { rows } = await pool.query(query, values);
      return rows[0] || record;
    } catch (err: any) {
      return record;
    }
  }

  public async findAll(options?: {
    merchantId?: string;
    caseId?: string;
    eventType?: string;
    actorType?: string;
    limit?: number;
    page?: number;
  }): Promise<{ events: AuditEvent[]; total: number; page: number; limit: number }> {
    let list: AuditEvent[] = [];

    try {
      const pool = getDbPool();
      let query = 'SELECT * FROM audit_events WHERE 1=1';
      const params: any[] = [];

      if (options?.merchantId) {
        params.push(options.merchantId);
        query += ` AND merchant_id = $${params.length}`;
      }
      if (options?.caseId) {
        params.push(options.caseId);
        query += ` AND recovery_case_id = $${params.length}`;
      }
      if (options?.eventType) {
        params.push(options.eventType);
        query += ` AND event_type = $${params.length}`;
      }
      if (options?.actorType) {
        params.push(options.actorType);
        query += ` AND actor_type = $${params.length}`;
      }

      query += ' ORDER BY timestamp DESC';

      const { rows } = await pool.query(query, params);
      if (rows && rows.length > 0) {
        list = rows;
      } else {
        list = [...AuditEventRepository.memoryStore];
      }
    } catch (err) {
      list = [...AuditEventRepository.memoryStore];
    }

    if (options?.merchantId) {
      list = list.filter(e => e.merchant_id === options.merchantId);
    }
    if (options?.caseId) {
      list = list.filter(e => e.recovery_case_id === options.caseId);
    }
    if (options?.eventType) {
      list = list.filter(e => e.event_type === options.eventType);
    }
    if (options?.actorType) {
      list = list.filter(e => e.actor_type === options.actorType);
    }

    const total = list.length;
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const startIndex = (page - 1) * limit;
    const paginatedEvents = list.slice(startIndex, startIndex + limit);

    return {
      events: paginatedEvents,
      total,
      page,
      limit
    };
  }

  public async listByMerchant(merchantId: string): Promise<AuditEvent[]> {
    return AuditEventRepository.memoryStore.filter(e => e.merchant_id === merchantId);
  }

  public async findAllByMerchant(merchantId: string): Promise<AuditEvent[]> {
    return this.listByMerchant(merchantId);
  }

  public async clear(): Promise<void> {
    AuditEventRepository.memoryStore = [];
  }
}


