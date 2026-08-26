import { RecoveryCase } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class RecoveryCaseRepository {
  public async create(rc: Partial<RecoveryCase>): Promise<RecoveryCase> {
    const pool = getDbPool();
    const query = `
      INSERT INTO recovery_cases (
        id, merchant_id, order_id, payment_id, case_type, amount_at_risk,
        recoverability_score, expected_recovery_value, diagnosis, diagnosis_confidence,
        recommended_action, action_confidence, policy_decision, status, retry_count,
        notification_count, started_at, expires_at, recovered_amount, closed_at, close_reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), $17, $18, $19, $20)
      RETURNING *;
    `;
    const values = [
      rc.id,
      rc.merchant_id,
      rc.order_id,
      rc.payment_id || null,
      rc.case_type,
      rc.amount_at_risk,
      rc.recoverability_score !== undefined ? rc.recoverability_score : null,
      rc.expected_recovery_value !== undefined ? rc.expected_recovery_value : null,
      rc.diagnosis || null,
      rc.diagnosis_confidence !== undefined ? rc.diagnosis_confidence : null,
      rc.recommended_action || null,
      rc.action_confidence !== undefined ? rc.action_confidence : null,
      rc.policy_decision || null,
      rc.status || 'NEW',
      rc.retry_count || 0,
      rc.notification_count || 0,
      rc.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      rc.recovered_amount || 0,
      rc.closed_at || null,
      rc.close_reason || null,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  public async findById(id: string): Promise<RecoveryCase | null> {
    const pool = getDbPool();
    const { rows } = await pool.query('SELECT * FROM recovery_cases WHERE id = $1', [id]);
    return rows[0] || null;
  }
}
