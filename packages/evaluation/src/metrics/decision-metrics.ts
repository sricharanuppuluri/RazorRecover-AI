import { EvaluationRecordResult } from './business-metrics';

export interface DecisionMetrics {
  action_selection_accuracy: number;
  diagnosis_accuracy: number;
  high_confidence_error_rate: number;
  human_escalation_rate: number;
  stop_rule_compliance: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  precision: number;
  recall: number;
  f1_score: number;
}

export function calculateDecisionMetrics(results: EvaluationRecordResult[]): DecisionMetrics {
  const total = results.length;
  if (total === 0) {
    return {
      action_selection_accuracy: 0,
      diagnosis_accuracy: 0,
      high_confidence_error_rate: 0,
      human_escalation_rate: 0,
      stop_rule_compliance: 0,
      tp: 0,
      fp: 0,
      tn: 0,
      fn: 0,
      precision: 0,
      recall: 0,
      f1_score: 0
    };
  }

  let correctActions = 0;
  let correctDiagnoses = 0;
  let humanEscalations = 0;
  let stopCompliances = 0;
  let stopOpportunities = 0;

  let highConfPredictions = 0;
  let highConfErrors = 0;

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const item of results) {
    const isGroundTruthRecoverable = item.record.ground_truth_recoverable;
    const predictedAction = item.decision.action;
    const isPredictedRecoverable = predictedAction !== 'STOP';

    // Confusion matrix for recoverability
    if (isPredictedRecoverable && isGroundTruthRecoverable) {
      tp++;
    } else if (isPredictedRecoverable && !isGroundTruthRecoverable) {
      fp++;
    } else if (!isPredictedRecoverable && !isGroundTruthRecoverable) {
      tn++;
    } else {
      fn++;
    }

    // Action selection accuracy
    if (predictedAction === item.record.ground_truth_best_action) {
      correctActions++;
    }

    // Diagnosis accuracy
    if (item.decision.predictedCategory === item.record.failure_category || item.record.failure_category !== 'UNKNOWN_OR_AMBIGUOUS') {
      correctDiagnoses++;
    }

    // Human escalation rate
    if (predictedAction === 'ESCALATE_HUMAN') {
      humanEscalations++;
    }

    // Stop rule compliance
    if (item.record.ground_truth_best_action === 'STOP') {
      stopOpportunities++;
      if (predictedAction === 'STOP') {
        stopCompliances++;
      }
    }

    // High confidence error rate (probability > 0.8 but not recovered)
    const prob = item.decision.predictedProbability || 0.5;
    if (prob >= 0.80) {
      highConfPredictions++;
      if (!item.simulatedRecovered) {
        highConfErrors++;
      }
    }
  }

  const precision = (tp + fp) > 0 ? parseFloat((tp / (tp + fp)).toFixed(4)) : 0;
  const recall = (tp + fn) > 0 ? parseFloat((tp / (tp + fn)).toFixed(4)) : 0;
  const f1_score = (precision + recall) > 0 ? parseFloat(((2 * precision * recall) / (precision + recall)).toFixed(4)) : 0;

  return {
    action_selection_accuracy: parseFloat((correctActions / total).toFixed(4)),
    diagnosis_accuracy: parseFloat((correctDiagnoses / total).toFixed(4)),
    high_confidence_error_rate: highConfPredictions > 0 ? parseFloat((highConfErrors / highConfPredictions).toFixed(4)) : 0,
    human_escalation_rate: parseFloat((humanEscalations / total).toFixed(4)),
    stop_rule_compliance: stopOpportunities > 0 ? parseFloat((stopCompliances / stopOpportunities).toFixed(4)) : 1.0,
    tp,
    fp,
    tn,
    fn,
    precision,
    recall,
    f1_score
  };
}
