import { EvaluationRecordResult } from './business-metrics';

export interface CalibrationBucket {
  range: string;
  min_prob: number;
  max_prob: number;
  prediction_count: number;
  average_predicted_probability: number;
  actual_recovery_rate: number;
}

export function calculateCalibrationMetrics(results: EvaluationRecordResult[]): CalibrationBucket[] {
  const buckets: CalibrationBucket[] = [];

  for (let i = 0; i < 10; i++) {
    const min_prob = i / 10;
    const max_prob = (i + 1) / 10;
    const range = `${min_prob.toFixed(1)}–${max_prob.toFixed(1)}`;

    const itemsInBucket = results.filter(r => {
      const p = r.decision.predictedProbability !== undefined ? r.decision.predictedProbability : 0.5;
      return i === 9 ? (p >= min_prob && p <= max_prob) : (p >= min_prob && p < max_prob);
    });

    const count = itemsInBucket.length;
    if (count === 0) {
      buckets.push({
        range,
        min_prob,
        max_prob,
        prediction_count: 0,
        average_predicted_probability: parseFloat(((min_prob + max_prob) / 2).toFixed(4)),
        actual_recovery_rate: 0
      });
      continue;
    }

    const sumProb = itemsInBucket.reduce((sum, r) => sum + (r.decision.predictedProbability || 0.5), 0);
    const sumRecovered = itemsInBucket.reduce((sum, r) => sum + (r.simulatedRecovered ? 1 : 0), 0);

    buckets.push({
      range,
      min_prob,
      max_prob,
      prediction_count: count,
      average_predicted_probability: parseFloat((sumProb / count).toFixed(4)),
      actual_recovery_rate: parseFloat((sumRecovered / count).toFixed(4))
    });
  }

  return buckets;
}
