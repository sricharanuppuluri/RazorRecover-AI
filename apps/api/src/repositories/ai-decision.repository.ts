import { AIDecision } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class AIDecisionRepository {
  private static memoryStore = new Map<string, AIDecision>();

  public async create(record: Partial<AIDecision>): Promise<AIDecision> {
    const fullRecord: AIDecision = {
      id: record.id || `aid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recovery_case_id: record.recovery_case_id!,
      model: record.model || 'mock-provider',
      prompt_version: record.prompt_version || 'RazorRecover-AI-Decision-v1',
      input_context_hash: record.input_context_hash || 'hash_placeholder',
      diagnosis: record.diagnosis || 'UNKNOWN_OR_AMBIGUOUS',
      recovery_probability: record.recovery_probability !== undefined ? record.recovery_probability : 0.5,
      recommended_action: record.recommended_action || 'ESCALATE',
      rationale: record.rationale || 'Decision generated',
      confidence: record.confidence !== undefined ? record.confidence : 0.5,
      created_at: record.created_at || new Date().toISOString()
    };

    AIDecisionRepository.memoryStore.set(fullRecord.id, fullRecord);
    AIDecisionRepository.memoryStore.set(`case_${fullRecord.recovery_case_id}`, fullRecord);

    try {
      const pool = getDbPool();
      const query = `
        INSERT INTO ai_decisions (
          id, recovery_case_id, model, prompt_version, input_context_hash,
          diagnosis, recovery_probability, recommended_action, rationale, confidence, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING *;
      `;
      const values = [
        fullRecord.id,
        fullRecord.recovery_case_id,
        fullRecord.model,
        fullRecord.prompt_version,
        fullRecord.input_context_hash,
        fullRecord.diagnosis,
        fullRecord.recovery_probability,
        fullRecord.recommended_action,
        fullRecord.rationale,
        fullRecord.confidence
      ];

      const { rows } = await pool.query(query, values);
      return rows[0] || fullRecord;
    } catch (err: any) {
      return fullRecord;
    }
  }

  public async findByCaseId(recoveryCaseId: string): Promise<AIDecision | null> {
    const key = `case_${recoveryCaseId}`;
    if (AIDecisionRepository.memoryStore.has(key)) {
      return AIDecisionRepository.memoryStore.get(key)!;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query(
        'SELECT * FROM ai_decisions WHERE recovery_case_id = $1 ORDER BY created_at DESC LIMIT 1',
        [recoveryCaseId]
      );
      if (rows[0]) {
        AIDecisionRepository.memoryStore.set(key, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }
}
