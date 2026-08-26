import { RecoveryExperiment } from '@razorrecover/shared-types';

export class ExperimentRepository {
  private static memoryStore: Map<string, RecoveryExperiment> = new Map();

  public async create(experiment: RecoveryExperiment): Promise<RecoveryExperiment> {
    ExperimentRepository.memoryStore.set(experiment.id, { ...experiment });
    return { ...experiment };
  }

  public async findById(id: string): Promise<RecoveryExperiment | null> {
    const experiment = ExperimentRepository.memoryStore.get(id);
    return experiment ? { ...experiment } : null;
  }

  public async findByMerchant(merchantId: string): Promise<RecoveryExperiment[]> {
    return Array.from(ExperimentRepository.memoryStore.values())
      .filter((e) => e.merchantId === merchantId);
  }

  public async update(id: string, updates: Partial<RecoveryExperiment>): Promise<RecoveryExperiment | null> {
    const experiment = ExperimentRepository.memoryStore.get(id);
    if (!experiment) return null;
    const updated = { ...experiment, ...updates, updatedAt: new Date().toISOString() };
    ExperimentRepository.memoryStore.set(id, updated);
    return { ...updated };
  }

  public async clear(): Promise<void> {
    ExperimentRepository.memoryStore.clear();
  }
}
