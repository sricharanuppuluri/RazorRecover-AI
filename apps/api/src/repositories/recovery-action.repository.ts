import { getDbPool } from '../config/database';
import { RecoveryAction, RecoveryActionStatus, AllowedAction } from '@razorrecover/shared-types';

// In-memory fallback repository store when DB is disconnected
const inMemoryActions: Map<string, RecoveryAction> = new Map();
const idempotencyIndex: Map<string, string> = new Map(); // key -> id

export class RecoveryActionRepository {
  public async createAction(input: Omit<RecoveryAction, 'id' | 'requested_at'> & { requested_at?: string }): Promise<RecoveryAction> {
    const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const requestedAt = input.requested_at || new Date().toISOString();

    const action: RecoveryAction = {
      id,
      recovery_case_id: input.recovery_case_id,
      merchant_id: input.merchant_id,
      action_type: input.action_type,
      status: input.status || 'PENDING',
      correlation_id: input.correlation_id,
      idempotency_key: input.idempotency_key,
      attempt_number: input.attempt_number || 1,
      requested_at: requestedAt,
      started_at: input.started_at,
      completed_at: input.completed_at,
      expires_at: input.expires_at,
      result_summary: input.result_summary,
      error_code: input.error_code,
      error_message: input.error_message,
      simulation: input.simulation || false
    };

    const pool = getDbPool();
    if (pool) {
      try {
        const query = `
          INSERT INTO recovery_actions (
            id, recovery_case_id, merchant_id, action_type, status,
            correlation_id, idempotency_key, attempt_number, requested_at,
            started_at, completed_at, expires_at, result_summary,
            error_code, error_message, simulation
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11, $12, $13,
            $14, $15, $16
          )
          RETURNING *;
        `;
        const values = [
          action.id, action.recovery_case_id, action.merchant_id, action.action_type, action.status,
          action.correlation_id, action.idempotency_key, action.attempt_number, action.requested_at,
          action.started_at, action.completed_at, action.expires_at, action.result_summary,
          action.error_code, action.error_message, action.simulation
        ];
        const res = await pool.query(query, values);
        const r = res.rows[0];
        const saved: RecoveryAction = {
          id: r.id,
          recovery_case_id: r.recovery_case_id,
          merchant_id: r.merchant_id,
          action_type: r.action_type as AllowedAction,
          status: r.status as RecoveryActionStatus,
          correlation_id: r.correlation_id,
          idempotency_key: r.idempotency_key,
          attempt_number: r.attempt_number,
          requested_at: r.requested_at ? new Date(r.requested_at).toISOString() : requestedAt,
          started_at: r.started_at ? new Date(r.started_at).toISOString() : undefined,
          completed_at: r.completed_at ? new Date(r.completed_at).toISOString() : undefined,
          expires_at: r.expires_at ? new Date(r.expires_at).toISOString() : undefined,
          result_summary: r.result_summary,
          error_code: r.error_code,
          error_message: r.error_message,
          simulation: r.simulation
        };
        inMemoryActions.set(saved.id, saved);
        idempotencyIndex.set(saved.idempotency_key, saved.id);
        return saved;
      } catch (err) {
        console.warn('[RecoveryActionRepository] Database insert failed, falling back to in-memory store:', (err as Error).message);
      }
    }

    inMemoryActions.set(action.id, action);
    idempotencyIndex.set(action.idempotency_key, action.id);
    return action;
  }

  public async findById(id: string): Promise<RecoveryAction | null> {
    const pool = getDbPool();
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM recovery_actions WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          return {
            id: r.id,
            recovery_case_id: r.recovery_case_id,
            merchant_id: r.merchant_id,
            action_type: r.action_type as AllowedAction,
            status: r.status as RecoveryActionStatus,
            correlation_id: r.correlation_id,
            idempotency_key: r.idempotency_key,
            attempt_number: r.attempt_number,
            requested_at: new Date(r.requested_at).toISOString(),
            started_at: r.started_at ? new Date(r.started_at).toISOString() : undefined,
            completed_at: r.completed_at ? new Date(r.completed_at).toISOString() : undefined,
            expires_at: r.expires_at ? new Date(r.expires_at).toISOString() : undefined,
            result_summary: r.result_summary,
            error_code: r.error_code,
            error_message: r.error_message,
            simulation: r.simulation
          };
        }
      } catch (err) {
        console.warn('[RecoveryActionRepository] DB lookup failed, falling back to memory:', (err as Error).message);
      }
    }
    return inMemoryActions.get(id) || null;
  }

  public async findByIdempotencyKey(key: string): Promise<RecoveryAction | null> {
    const pool = getDbPool();
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM recovery_actions WHERE idempotency_key = $1', [key]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          return {
            id: r.id,
            recovery_case_id: r.recovery_case_id,
            merchant_id: r.merchant_id,
            action_type: r.action_type as AllowedAction,
            status: r.status as RecoveryActionStatus,
            correlation_id: r.correlation_id,
            idempotency_key: r.idempotency_key,
            attempt_number: r.attempt_number,
            requested_at: new Date(r.requested_at).toISOString(),
            started_at: r.started_at ? new Date(r.started_at).toISOString() : undefined,
            completed_at: r.completed_at ? new Date(r.completed_at).toISOString() : undefined,
            expires_at: r.expires_at ? new Date(r.expires_at).toISOString() : undefined,
            result_summary: r.result_summary,
            error_code: r.error_code,
            error_message: r.error_message,
            simulation: r.simulation
          };
        }
      } catch (err) {
        console.warn('[RecoveryActionRepository] DB lookup failed, falling back to memory:', (err as Error).message);
      }
    }
    const memId = idempotencyIndex.get(key);
    return memId ? inMemoryActions.get(memId) || null : null;
  }

  public async findByCaseId(caseId: string): Promise<RecoveryAction[]> {
    const pool = getDbPool();
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM recovery_actions WHERE recovery_case_id = $1 ORDER BY requested_at DESC', [caseId]);
        return res.rows.map(r => ({
          id: r.id,
          recovery_case_id: r.recovery_case_id,
          merchant_id: r.merchant_id,
          action_type: r.action_type as AllowedAction,
          status: r.status as RecoveryActionStatus,
          correlation_id: r.correlation_id,
          idempotency_key: r.idempotency_key,
          attempt_number: r.attempt_number,
          requested_at: new Date(r.requested_at).toISOString(),
          started_at: r.started_at ? new Date(r.started_at).toISOString() : undefined,
          completed_at: r.completed_at ? new Date(r.completed_at).toISOString() : undefined,
          expires_at: r.expires_at ? new Date(r.expires_at).toISOString() : undefined,
          result_summary: r.result_summary,
          error_code: r.error_code,
          error_message: r.error_message,
          simulation: r.simulation
        }));
      } catch (err) {
        console.warn('[RecoveryActionRepository] DB list failed, falling back to memory:', (err as Error).message);
      }
    }
    return Array.from(inMemoryActions.values())
      .filter(a => a.recovery_case_id === caseId)
      .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
  }

  public async updateActionStatus(
    id: string,
    status: RecoveryActionStatus,
    extra?: { completedAt?: string; startedAt?: string; resultSummary?: string; errorCode?: string; errorMessage?: string }
  ): Promise<RecoveryAction> {
    const action = await this.findById(id);
    if (!action) {
      throw new Error(`RecoveryAction with ID ${id} not found.`);
    }

    action.status = status;
    if (extra?.startedAt) action.started_at = extra.startedAt;
    if (extra?.completedAt) action.completed_at = extra.completedAt;
    if (extra?.resultSummary) action.result_summary = extra.resultSummary;
    if (extra?.errorCode) action.error_code = extra.errorCode;
    if (extra?.errorMessage) action.error_message = extra.errorMessage;

    const pool = getDbPool();
    if (pool) {
      try {
        await pool.query(
          `UPDATE recovery_actions SET
            status = $1, started_at = $2, completed_at = $3,
            result_summary = $4, error_code = $5, error_message = $6
           WHERE id = $7`,
          [
            action.status, action.started_at, action.completed_at,
            action.result_summary, action.error_code, action.error_message,
            id
          ]
        );
      } catch (err) {
        console.warn('[RecoveryActionRepository] DB update failed, updated in-memory store:', (err as Error).message);
      }
    }

    inMemoryActions.set(id, action);
    return action;
  }

  public clearInMemoryStore(): void {
    inMemoryActions.clear();
    idempotencyIndex.clear();
  }
}
