import { PolicyDecision } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class PolicyDecisionRepository {
  private static memoryStore = new Map<string, PolicyDecision>();

  public async create(record: Partial<PolicyDecision>): Promise<PolicyDecision> {
    const fullRecord: PolicyDecision = {
      id: record.id || `pol_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recovery_case_id: record.recovery_case_id!,
      action: record.action || 'ESCALATE',
      allowed: record.allowed !== undefined ? record.allowed : false,
      reasons: record.reasons || [],
      violated_rules: record.violated_rules || [],
      requires_human: record.requires_human !== undefined ? record.requires_human : true,
      policy_version: record.policy_version || 'policy-v1',
      created_at: record.created_at || new Date().toISOString()
    };

    PolicyDecisionRepository.memoryStore.set(fullRecord.id, fullRecord);
    PolicyDecisionRepository.memoryStore.set(`case_${fullRecord.recovery_case_id}`, fullRecord);

    try {
      const pool = getDbPool();
      const query = `
        INSERT INTO policy_decisions (
          id, recovery_case_id, action, allowed, reasons, violated_rules, requires_human, policy_version, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *;
      `;
      const values = [
        fullRecord.id,
        fullRecord.recovery_case_id,
        fullRecord.action,
        fullRecord.allowed,
        JSON.stringify(fullRecord.reasons),
        JSON.stringify(fullRecord.violated_rules),
        fullRecord.requires_human,
        fullRecord.policy_version
      ];

      const { rows } = await pool.query(query, values);
      return rows[0] || fullRecord;
    } catch (err: any) {
      return fullRecord;
    }
  }

  public async findByCaseId(recoveryCaseId: string): Promise<PolicyDecision | null> {
    const key = `case_${recoveryCaseId}`;
    if (PolicyDecisionRepository.memoryStore.has(key)) {
      return PolicyDecisionRepository.memoryStore.get(key)!;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query(
        'SELECT * FROM policy_decisions WHERE recovery_case_id = $1 ORDER BY created_at DESC LIMIT 1',
        [recoveryCaseId]
      );
      if (rows[0]) {
        PolicyDecisionRepository.memoryStore.set(key, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }
}
