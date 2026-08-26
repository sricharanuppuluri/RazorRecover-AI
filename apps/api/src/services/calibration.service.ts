import { CalibrationMetrics, ModelDriftAlert } from '@razorrecover/shared-types';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';

export class CalibrationService {
  private caseRepo = new RecoveryCaseRepository();

  public async calculateCalibration(merchantId: string): Promise<CalibrationMetrics> {
    const cases = await this.caseRepo.findAllByMerchant(merchantId);
    const closedCases = cases.filter((c) => c.status === 'RECOVERED' || c.status === 'FAILED' || c.status === 'STOPPED');

    if (closedCases.length === 0) {
      return {
        merchantId,
        totalEvaluatedCases: 0,
        expectedCalibrationError: 0,
        brierScore: 0,
        diagnosisAccuracy: 1.0,
        binnedCalibration: [],
      };
    }

    const bins = [
      { min: 0.0, max: 0.2, sumPred: 0, count: 0, actualRecovered: 0 },
      { min: 0.2, max: 0.4, sumPred: 0, count: 0, actualRecovered: 0 },
      { min: 0.4, max: 0.6, sumPred: 0, count: 0, actualRecovered: 0 },
      { min: 0.6, max: 0.8, sumPred: 0, count: 0, actualRecovered: 0 },
      { min: 0.8, max: 1.0, sumPred: 0, count: 0, actualRecovered: 0 },
    ];

    let brierSum = 0;
    let correctDiagnoses = 0;

    for (const c of closedCases) {
      const predProb = c.recoverability_score || 0.5;
      const actualOutcome = c.status === 'RECOVERED' ? 1 : 0;

      brierSum += Math.pow(predProb - actualOutcome, 2);
      if ((c.diagnosis_confidence ?? 0) > 0.70) {
        correctDiagnoses++;
      }

      for (const bin of bins) {
        if (predProb >= bin.min && (predProb < bin.max || (bin.max === 1.0 && predProb <= 1.0))) {
          bin.sumPred += predProb;
          bin.count++;
          if (actualOutcome === 1) {
            bin.actualRecovered++;
          }
          break;
        }
      }
    }

    const total = closedCases.length;
    let eceSum = 0;

    const binnedCalibration = bins.map((bin) => {
      const count = bin.count;
      const predictedProb = count > 0 ? bin.sumPred / count : (bin.min + bin.max) / 2;
      const actualRate = count > 0 ? bin.actualRecovered / count : 0;
      if (count > 0) {
        eceSum += (count / total) * Math.abs(predictedProb - actualRate);
      }
      return {
        binMin: bin.min,
        binMax: bin.max,
        predictedProb: Number(predictedProb.toFixed(4)),
        actualRecoveryRate: Number(actualRate.toFixed(4)),
        count,
      };
    });

    return {
      merchantId,
      totalEvaluatedCases: total,
      expectedCalibrationError: Number(eceSum.toFixed(4)),
      brierScore: Number((brierSum / total).toFixed(4)),
      diagnosisAccuracy: Number((correctDiagnoses / total).toFixed(4)),
      binnedCalibration,
    };
  }

  public async detectDrift(merchantId: string): Promise<ModelDriftAlert[]> {
    const metrics = await this.calculateCalibration(merchantId);
    const alerts: ModelDriftAlert[] = [];
    const now = new Date().toISOString();

    if (metrics.diagnosisAccuracy < 0.85 && metrics.totalEvaluatedCases >= 5) {
      alerts.push({
        id: `alert_diag_${Date.now()}`,
        merchantId,
        metric: 'DIAGNOSIS_ACCURACY',
        threshold: 0.85,
        actualValue: metrics.diagnosisAccuracy,
        severity: metrics.diagnosisAccuracy < 0.70 ? 'HIGH' : 'MEDIUM',
        detectedAt: now,
        recommendation: 'Model diagnosis accuracy dropped below threshold (85%). Re-calibrate prompt context or inspect failure taxonomy.',
      });
    }

    if (metrics.expectedCalibrationError > 0.15 && metrics.totalEvaluatedCases >= 5) {
      alerts.push({
        id: `alert_ece_${Date.now()}`,
        merchantId,
        metric: 'CALIBRATION_ERROR',
        threshold: 0.15,
        actualValue: metrics.expectedCalibrationError,
        severity: 'MEDIUM',
        detectedAt: now,
        recommendation: 'Expected calibration error exceeded 15%. Predicted recoverability probabilities overestimate actual recovery yields.',
      });
    }

    return alerts;
  }
}
