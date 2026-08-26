import { PolicyEngine } from '@razorrecover/policy-engine';
import { Baseline, BaselineDecision } from './baseline.interface';
import { SyntheticRecord } from '../generator/synthetic-record.interface';

export class AlwaysRetryBaseline implements Baseline {
  public name = 'Always Retry';
  private policyEngine = new PolicyEngine();

  public async evaluateRecord(record: SyntheticRecord): Promise<BaselineDecision> {
    const policyResult = this.policyEngine.evaluate({
      aiDecision: {
        recommendedAction: 'WAIT_AND_RETRY',
        confidence: 0.85,
        recoveryProbability: 0.50,
        diagnosis: record.failure_category,
        rationale: 'Always Retry strategy'
      },
      deterministicAnalysis: {
        merchantId: 'mch_eval',
        amountAtRisk: record.amount,
        diagnosis: {
          category: record.failure_category,
          explanation: 'Deterministic evaluation diagnosis',
          confidence: 0.85,
          reasonCodes: []
        },
        recoveryProbability: 0.50,
        expectedRecoveryValue: Math.floor(record.amount * 0.50),
        priorityScore: 50,
        highValue: record.is_high_value,
        eligibleForRecovery: record.failure_category !== 'ALREADY_CAPTURED'
      },
      customer: {
        contact_opt_in: record.contact_opt_in
      },
      payment: {
        status: record.failure_category === 'ALREADY_CAPTURED' ? 'CAPTURED' : 'FAILED'
      },
      recoveryCase: {
        status: record.failure_category === 'ALREADY_CAPTURED' ? 'RECOVERED' : 'POLICY_CHECK',
        retry_count: record.attempt_number - 1,
        notification_count: 0
      }
    });

    if (!policyResult.allowed) {
      return {
        action: 'STOP',
        allowedByPolicy: false,
        policyReason: policyResult.reasons.join('; '),
        predictedProbability: 0.20
      };
    }

    return {
      action: 'WAIT_AND_RETRY',
      allowedByPolicy: true,
      predictedProbability: 0.50
    };
  }
}
