import { ExperimentAnalytics, RecoveryExperiment, ExperimentVariant } from '@razorrecover/shared-types';
import { ExperimentRepository } from '../repositories/experiment.repository';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';

export class ExperimentService {
  private experimentRepo = new ExperimentRepository();
  private caseRepo = new RecoveryCaseRepository();

  public async createExperiment(
    merchantId: string,
    name: string,
    variants: Array<{ name: string; strategy: 'AI_AGENT' | 'RULE_BASED' | 'CONTROL_NO_RECOVERY'; weight: number }>
  ): Promise<RecoveryExperiment> {
    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const experiment: RecoveryExperiment = {
      id,
      merchantId,
      name,
      status: 'ACTIVE',
      variants: variants.map((v, i) => ({ id: `var_${i}_${id}`, ...v })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.experimentRepo.create(experiment);
  }

  public async getExperiments(merchantId: string): Promise<RecoveryExperiment[]> {
    return this.experimentRepo.findByMerchant(merchantId);
  }

  public async assignVariant(merchantId: string, caseId: string, experimentId: string): Promise<ExperimentVariant | null> {
    const exp = await this.experimentRepo.findById(experimentId);
    if (!exp || exp.merchantId !== merchantId || exp.status !== 'ACTIVE') {
      return null;
    }

    // Deterministic variant assignment via string hash
    let hash = 0;
    const str = `${caseId}:${exp.id}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const bucket = Math.abs(hash) % 100;

    let cumulative = 0;
    for (const variant of exp.variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) {
        return variant;
      }
    }

    return exp.variants[0] || null;
  }

  public async getExperimentAnalytics(merchantId: string, experimentId: string): Promise<ExperimentAnalytics> {
    const exp = await this.experimentRepo.findById(experimentId);
    if (!exp || exp.merchantId !== merchantId) {
      throw new Error('Experiment not found or unauthorized');
    }

    const cases = await this.caseRepo.findAllByMerchant(merchantId);
    const totalCases = cases.length;

    const variantMetrics: Record<string, {
      cases: number;
      recoveredCases: number;
      recoveredAmount: number;
      recoveryRate: number;
      recoveryYield: number;
    }> = {};

    for (const variant of exp.variants) {
      // Aggregate simulated/assigned cases for this variant strategy
      const variantCases = cases.filter((c) => {
        if (variant.strategy === 'AI_AGENT') return Boolean(c.diagnosis && (c.diagnosis_confidence ?? 0) > 0.8);
        if (variant.strategy === 'RULE_BASED') return c.recommended_action === 'WAIT_AND_RETRY';
        return c.status === 'STOPPED';
      });

      const count = variantCases.length;
      const recoveredCases = variantCases.filter((c) => c.status === 'RECOVERED');
      const recoveredAmount = recoveredCases.reduce((sum, c) => sum + (c.recovered_amount || c.amount_at_risk), 0);
      const totalRisk = variantCases.reduce((sum, c) => sum + c.amount_at_risk, 0);

      variantMetrics[variant.name] = {
        cases: count,
        recoveredCases: recoveredCases.length,
        recoveredAmount,
        recoveryRate: count > 0 ? Number((recoveredCases.length / count).toFixed(4)) : 0,
        recoveryYield: totalRisk > 0 ? Number((recoveredAmount / totalRisk).toFixed(4)) : 0,
      };
    }

    return {
      experimentId,
      merchantId,
      totalCases,
      variantMetrics,
    };
  }
}
