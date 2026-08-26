import { EvaluationRecordResult } from '../metrics/business-metrics';
import { SyntheticRecord } from '../generator/synthetic-record.interface';
import { BaselineDecision } from '../baselines/baseline.interface';

export function simulateOutcome(
  record: SyntheticRecord,
  decision: BaselineDecision
): EvaluationRecordResult {
  // If action is STOP or policy denied, no action is taken
  if (decision.action === 'STOP' || !decision.allowedByPolicy) {
    return {
      record,
      decision,
      simulatedRecovered: false,
      simulatedRecoveredAmount: 0,
      simulatedCost: 0
    };
  }

  // Cost calculation based on executed action
  let cost = 0;
  switch (decision.action) {
    case 'WAIT_AND_RETRY':
    case 'RETRY':
      cost = 100; // 1 INR
      break;
    case 'SEND_RECOVERY_LINK':
    case 'SEND_REMINDER':
    case 'NOTIFY':
      cost = 50; // 0.5 INR
      break;
    case 'OFFER_ALTERNATE_PAYMENT':
      cost = 200; // 2 INR
      break;
    case 'ESCALATE_HUMAN':
    case 'ESCALATE':
      cost = 2000; // 20 INR
      break;
    default:
      cost = 0;
      break;
  }

  // Action compatibility check with ground truth
  let isActionCompatible = false;
  if (decision.action === record.ground_truth_best_action) {
    isActionCompatible = true;
  } else if (
    (decision.action === 'SEND_REMINDER' && record.ground_truth_best_action === 'SEND_RECOVERY_LINK') ||
    (decision.action === 'SEND_RECOVERY_LINK' && record.ground_truth_best_action === 'SEND_REMINDER') ||
    (decision.action === 'OFFER_ALTERNATE_PAYMENT' && record.ground_truth_best_action === 'WAIT_AND_RETRY') ||
    (decision.action === 'WAIT_AND_RETRY' && record.ground_truth_best_action === 'OFFER_ALTERNATE_PAYMENT')
  ) {
    isActionCompatible = true;
  }

  const recovered = record.ground_truth_recoverable && isActionCompatible;
  const recoveredAmount = recovered ? record.amount : 0;

  return {
    record,
    decision,
    simulatedRecovered: recovered,
    simulatedRecoveredAmount: recoveredAmount,
    simulatedCost: cost
  };
}
