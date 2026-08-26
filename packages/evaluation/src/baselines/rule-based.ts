import { AllowedAction } from '@razorrecover/shared-types';
import { PolicyEngine } from '@razorrecover/policy-engine';
import { Baseline, BaselineDecision } from './baseline.interface';
import { SyntheticRecord } from '../generator/synthetic-record.interface';

export class RuleBasedBaseline implements Baseline {
  public name = 'Rule-Based';
  private policyEngine = new PolicyEngine();

  public async evaluateRecord(record: SyntheticRecord): Promise<BaselineDecision> {
    let proposedAction: AllowedAction;

    if (record.failure_category === 'ALREADY_CAPTURED') {
      proposedAction = 'STOP';
    } else if (record.is_high_value && record.failure_category === 'UNKNOWN_OR_AMBIGUOUS') {
      proposedAction = 'ESCALATE_HUMAN';
    } else if (record.failure_category === 'TEMPORARY_BANK_DEGRADATION') {
      proposedAction = 'WAIT_AND_RETRY';
    } else if (record.failure_category === 'CUSTOMER_AUTHENTICATION_ISSUE') {
      proposedAction = 'SEND_RECOVERY_LINK';
    } else if (record.failure_category === 'INSUFFICIENT_FUNDS') {
      proposedAction = 'OFFER_ALTERNATE_PAYMENT';
    } else if (record.failure_category === 'CHECKOUT_ABANDONMENT') {
      proposedAction = 'SEND_RECOVERY_LINK';
    } else if (record.failure_category === 'REPEATED_FAILURE') {
      proposedAction = 'STOP';
    } else {
      proposedAction = 'ESCALATE_HUMAN';
    }

    const policyResult = this.policyEngine.evaluate({
      aiDecision: {
        recommendedAction: proposedAction,
        confidence: 0.85,
        recoveryProbability: 0.65,
        diagnosis: record.failure_category,
        rationale: 'Rule-Based heuristic decision'
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
        recoveryProbability: 0.65,
        expectedRecoveryValue: Math.floor(record.amount * 0.65),
        priorityScore: 65,
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
      action: proposedAction,
      allowedByPolicy: true,
      predictedProbability: 0.65
    };
  }
}
