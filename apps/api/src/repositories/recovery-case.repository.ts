import { RecoveryCase } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class RecoveryCaseRepository {
  private static memoryStore = new Map<string, RecoveryCase>();

  public async create(rc: Partial<RecoveryCase>): Promise<RecoveryCase> {
    const record: RecoveryCase = {
      id: rc.id || `rc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      merchant_id: rc.merchant_id || 'mch_test_01',
      order_id: rc.order_id!,
      payment_id: rc.payment_id,
      case_type: rc.case_type || 'PAYMENT_FAILURE',
      amount_at_risk: rc.amount_at_risk || 0,
      recoverability_score: rc.recoverability_score,
      expected_recovery_value: rc.expected_recovery_value,
      diagnosis: rc.diagnosis,
      diagnosis_confidence: rc.diagnosis_confidence,
      priority_score: rc.priority_score,
      recommended_action: rc.recommended_action,
      action_confidence: rc.action_confidence,
      policy_decision: rc.policy_decision,
      status: rc.status || 'NEW',
      retry_count: rc.retry_count || 0,
      notification_count: rc.notification_count || 0,
      started_at: rc.started_at || new Date().toISOString(),
      expires_at: rc.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      recovered_amount: rc.recovered_amount || 0,
      closed_at: rc.closed_at,
      close_reason: rc.close_reason
    };

    RecoveryCaseRepository.memoryStore.set(record.id, record);
    if (record.payment_id) {
      RecoveryCaseRepository.memoryStore.set(`pay_${record.payment_id}`, record);
    }
    if (record.order_id) {
      RecoveryCaseRepository.memoryStore.set(`ord_${record.order_id}`, record);
    }

    try {
      const pool = getDbPool();
      const query = `
        INSERT INTO recovery_cases (
          id, merchant_id, order_id, payment_id, case_type, amount_at_risk,
          recoverability_score, expected_recovery_value, diagnosis, diagnosis_confidence,
          priority_score, recommended_action, action_confidence, policy_decision, status,
          retry_count, notification_count, started_at, expires_at, recovered_amount, closed_at, close_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), $18, $19, $20, $21)
        RETURNING *;
      `;
      const values = [
        record.id,
        record.merchant_id,
        record.order_id,
        record.payment_id || null,
        record.case_type,
        record.amount_at_risk,
        record.recoverability_score !== undefined ? record.recoverability_score : null,
        record.expected_recovery_value !== undefined ? record.expected_recovery_value : null,
        record.diagnosis || null,
        record.diagnosis_confidence !== undefined ? record.diagnosis_confidence : null,
        record.priority_score !== undefined ? record.priority_score : null,
        record.recommended_action || null,
        record.action_confidence !== undefined ? record.action_confidence : null,
        record.policy_decision || null,
        record.status,
        record.retry_count,
        record.notification_count,
        record.expires_at,
        record.recovered_amount,
        record.closed_at || null,
        record.close_reason || null,
      ];

      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (err: any) {
      return record;
    }
  }

  public async findById(id: string): Promise<RecoveryCase | null> {
    if (RecoveryCaseRepository.memoryStore.has(id)) {
      return RecoveryCaseRepository.memoryStore.get(id)!;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM recovery_cases WHERE id = $1', [id]);
      if (rows[0]) {
        RecoveryCaseRepository.memoryStore.set(rows[0].id, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }

  public async findByPaymentId(paymentId: string): Promise<RecoveryCase | null> {
    const key = `pay_${paymentId}`;
    if (RecoveryCaseRepository.memoryStore.has(key)) {
      return RecoveryCaseRepository.memoryStore.get(key)!;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM recovery_cases WHERE payment_id = $1 ORDER BY started_at DESC LIMIT 1', [paymentId]);
      if (rows[0]) {
        RecoveryCaseRepository.memoryStore.set(key, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }

  public async findByOrderId(orderId: string): Promise<RecoveryCase | null> {
    const key = `ord_${orderId}`;
    if (RecoveryCaseRepository.memoryStore.has(key)) {
      return RecoveryCaseRepository.memoryStore.get(key)!;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM recovery_cases WHERE order_id = $1 ORDER BY started_at DESC LIMIT 1', [orderId]);
      if (rows[0]) {
        RecoveryCaseRepository.memoryStore.set(key, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }

  public async updateDeterministicAnalysis(
    id: string,
    updates: {
      amount_at_risk: number;
      recoverability_score: number;
      expected_recovery_value: number;
      diagnosis: string;
      diagnosis_confidence: number;
      priority_score: number;
      status?: RecoveryCase['status'];
    }
  ): Promise<RecoveryCase | null> {
    let record = RecoveryCaseRepository.memoryStore.get(id);
    if (record) {
      record.amount_at_risk = updates.amount_at_risk;
      record.recoverability_score = updates.recoverability_score;
      record.expected_recovery_value = updates.expected_recovery_value;
      record.diagnosis = updates.diagnosis;
      record.diagnosis_confidence = updates.diagnosis_confidence;
      record.priority_score = updates.priority_score;
      if (updates.status) record.status = updates.status;

      RecoveryCaseRepository.memoryStore.set(id, record);
    }

    try {
      const pool = getDbPool();
      const query = `
        UPDATE recovery_cases
        SET amount_at_risk = $1,
            recoverability_score = $2,
            expected_recovery_value = $3,
            diagnosis = $4,
            diagnosis_confidence = $5,
            priority_score = $6,
            status = COALESCE($7, status)
        WHERE id = $8
        RETURNING *;
      `;
      const values = [
        updates.amount_at_risk,
        updates.recoverability_score,
        updates.expected_recovery_value,
        updates.diagnosis,
        updates.diagnosis_confidence,
        updates.priority_score,
        updates.status || null,
        id
      ];

      const { rows } = await pool.query(query, values);
      return rows[0] || record || null;
    } catch (err: any) {
      return record || null;
    }
  }

  public async updateStatus(
    id: string,
    status: RecoveryCase['status'],
    extra?: { closedAt?: string; closeReason?: string; recoveredAmount?: number }
  ): Promise<RecoveryCase | null> {
    let record = RecoveryCaseRepository.memoryStore.get(id);
    if (record) {
      record.status = status;
      if (extra?.closedAt) record.closed_at = extra.closedAt;
      if (extra?.closeReason) record.close_reason = extra.closeReason;
      if (extra?.recoveredAmount !== undefined) record.recovered_amount = extra.recoveredAmount;
      RecoveryCaseRepository.memoryStore.set(id, record);
    }

    try {
      const pool = getDbPool();
      const query = `
        UPDATE recovery_cases
        SET status = $1,
            closed_at = COALESCE($2, closed_at),
            close_reason = COALESCE($3, close_reason),
            recovered_amount = COALESCE($4, recovered_amount)
        WHERE id = $5
        RETURNING *;
      `;
      const values = [status, extra?.closedAt || null, extra?.closeReason || null, extra?.recoveredAmount ?? null, id];
      const { rows } = await pool.query(query, values);
      return rows[0] || record || null;
    } catch (err: any) {
      return record || null;
    }
  }

  public async incrementRetryCount(id: string): Promise<RecoveryCase | null> {
    let record = RecoveryCaseRepository.memoryStore.get(id);
    if (record) {
      record.retry_count = (record.retry_count || 0) + 1;
      RecoveryCaseRepository.memoryStore.set(id, record);
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('UPDATE recovery_cases SET retry_count = retry_count + 1 WHERE id = $1 RETURNING *', [id]);
      return rows[0] || record || null;
    } catch (err: any) {
      return record || null;
    }
  }

  public async incrementNotificationCount(id: string): Promise<RecoveryCase | null> {
    let record = RecoveryCaseRepository.memoryStore.get(id);
    if (record) {
      record.notification_count = (record.notification_count || 0) + 1;
      RecoveryCaseRepository.memoryStore.set(id, record);
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('UPDATE recovery_cases SET notification_count = notification_count + 1 WHERE id = $1 RETURNING *', [id]);
      return rows[0] || record || null;
    } catch (err: any) {
      return record || null;
    }
  }
}
