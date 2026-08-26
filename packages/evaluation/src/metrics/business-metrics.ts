import { SyntheticRecord } from '../generator/synthetic-record.interface';
import { BaselineDecision } from '../baselines/baseline.interface';

export interface BusinessMetrics {
  total_records: number;
  total_revenue_at_risk: number; // integer paise
  potentially_recoverable_revenue: number; // integer paise
  actual_recovered_revenue: number; // integer paise
  total_intervention_cost: number; // integer paise
  net_revenue_recovered: number; // integer paise
  recovery_rate: number; // float 0..1
  recovery_yield: number; // float 0..1
  average_recovered_amount_per_successful_intervention: number; // float paise
  intervention_success_rate: number; // float 0..1
  interventions_attempted: number;
  successful_interventions: number;
  incremental_revenue_vs_no_recovery: number; // integer paise
  incremental_revenue_vs_rule_based: number; // integer paise
}

export interface EvaluationRecordResult {
  record: SyntheticRecord;
  decision: BaselineDecision;
  simulatedRecovered: boolean;
  simulatedRecoveredAmount: number;
  simulatedCost: number;
}

export function calculateBusinessMetrics(
  results: EvaluationRecordResult[],
  noRecoveryRecovered: number = 0,
  ruleBasedRecovered: number = 0
): BusinessMetrics {
  const total_records = results.length;
  let total_revenue_at_risk = 0;
  let potentially_recoverable_revenue = 0;
  let actual_recovered_revenue = 0;
  let total_intervention_cost = 0;
  let interventions_attempted = 0;
  let successful_interventions = 0;

  for (const item of results) {
    total_revenue_at_risk += item.record.amount;
    if (item.record.ground_truth_recoverable) {
      potentially_recoverable_revenue += item.record.amount;
    }
    actual_recovered_revenue += item.simulatedRecoveredAmount;
    total_intervention_cost += item.simulatedCost;

    if (item.decision.action !== 'STOP') {
      interventions_attempted++;
      if (item.simulatedRecovered) {
        successful_interventions++;
      }
    }
  }

  const net_revenue_recovered = actual_recovered_revenue - total_intervention_cost;

  const recovery_rate = potentially_recoverable_revenue > 0
    ? parseFloat((actual_recovered_revenue / potentially_recoverable_revenue).toFixed(4))
    : 0;

  const recovery_yield = total_revenue_at_risk > 0
    ? parseFloat((actual_recovered_revenue / total_revenue_at_risk).toFixed(4))
    : 0;

  const average_recovered_amount_per_successful_intervention = successful_interventions > 0
    ? parseFloat((actual_recovered_revenue / successful_interventions).toFixed(2))
    : 0;

  const intervention_success_rate = interventions_attempted > 0
    ? parseFloat((successful_interventions / interventions_attempted).toFixed(4))
    : 0;

  const incremental_revenue_vs_no_recovery = actual_recovered_revenue - noRecoveryRecovered;
  const incremental_revenue_vs_rule_based = actual_recovered_revenue - ruleBasedRecovered;

  return {
    total_records,
    total_revenue_at_risk,
    potentially_recoverable_revenue,
    actual_recovered_revenue,
    total_intervention_cost,
    net_revenue_recovered,
    recovery_rate,
    recovery_yield,
    average_recovered_amount_per_successful_intervention,
    intervention_success_rate,
    interventions_attempted,
    successful_interventions,
    incremental_revenue_vs_no_recovery,
    incremental_revenue_vs_rule_based
  };
}
