import { AIDecision, AIDecisionOutput, AIInputContext } from '@razorrecover/shared-types';
import { AIDecisionRepository } from '../../repositories/ai-decision.repository';
import { AuditService } from '../audit.service';
import { getAIProvider, AIProvider } from './ai-provider';
import { hashContext, PROMPT_VERSION } from './prompt-builder';

export class AIDecisionService {
  private repo = new AIDecisionRepository();
  private auditService = new AuditService();

  public async generateAndPersistDecision(
    context: AIInputContext,
    recoveryCaseId: string,
    customProvider?: AIProvider
  ): Promise<AIDecision> {
    const contextHash = hashContext(context);
    const provider = customProvider || getAIProvider();
    const modelName = process.env.LLM_MODEL || (customProvider ? 'custom-provider' : 'mock-provider');

    let output: AIDecisionOutput;
    let fallbackTriggered = false;

    try {
      output = await provider.generateDecision(context);
    } catch (err: any) {
      fallbackTriggered = true;
      const errorMessage = err?.message || String(err);

      // Audit AI provider failure & fallback
      await this.auditService.logEvent({
        merchantId: context.merchant.id,
        recoveryCaseId: recoveryCaseId,
        eventType: 'AI_DECISION_FALLBACK_TRIGGERED',
        actorType: 'system',
        action: 'AI_PROVIDER_FALLBACK',
        inputSummary: `context_hash:${contextHash.substring(0, 16)}`,
        decisionSummary: `Fallback triggered due to error: ${errorMessage.substring(0, 150)}`,
        outcome: 'FALLBACK_TO_SAFE_ESCALATE',
        correlationId: `corr_ai_${Date.now()}`
      });

      // Safe Fallback Output (Never authorize financial actions on fallback)
      output = {
        diagnosis: context.analysis?.diagnosis?.category || 'UNKNOWN_OR_AMBIGUOUS',
        recoveryProbability: context.analysis?.recoveryProbability || 0.0,
        recommendedAction: 'ESCALATE',
        rationale: `AI provider call failed or returned invalid output. Safe fallback triggered: ${errorMessage.substring(0, 100)}`,
        confidence: 0.0
      };
    }

    const aiDecisionRecord = await this.repo.create({
      recovery_case_id: recoveryCaseId,
      model: modelName,
      prompt_version: PROMPT_VERSION,
      input_context_hash: contextHash,
      diagnosis: output.diagnosis,
      recovery_probability: output.recoveryProbability,
      recommended_action: output.recommendedAction,
      rationale: output.rationale,
      confidence: output.confidence
    });

    // Audit AI Decision generation
    await this.auditService.logEvent({
      merchantId: context.merchant.id,
      recoveryCaseId: recoveryCaseId,
      eventType: 'AI_DECISION_GENERATED',
      actorType: 'ai',
      action: 'RECOMMEND_ACTION',
      inputSummary: `hash:${contextHash.substring(0, 16)}`,
      decisionSummary: `Action:${output.recommendedAction}, Diag:${output.diagnosis}, Conf:${output.confidence}, Fallback:${fallbackTriggered}`,
      outcome: output.recommendedAction,
      correlationId: `corr_ai_${Date.now()}`
    });

    return aiDecisionRecord;
  }
}
