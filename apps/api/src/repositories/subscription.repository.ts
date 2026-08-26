import { SubscriptionFailure } from '@razorrecover/shared-types';

export class SubscriptionRepository {
  private static memoryStore: Map<string, SubscriptionFailure> = new Map();

  public async create(failure: SubscriptionFailure): Promise<SubscriptionFailure> {
    SubscriptionRepository.memoryStore.set(failure.id, { ...failure });
    return { ...failure };
  }

  public async findById(id: string): Promise<SubscriptionFailure | null> {
    const failure = SubscriptionRepository.memoryStore.get(id);
    return failure ? { ...failure } : null;
  }

  public async findByMerchant(merchantId: string): Promise<SubscriptionFailure[]> {
    return Array.from(SubscriptionRepository.memoryStore.values())
      .filter((s) => s.merchantId === merchantId);
  }

  public async update(id: string, updates: Partial<SubscriptionFailure>): Promise<SubscriptionFailure | null> {
    const failure = SubscriptionRepository.memoryStore.get(id);
    if (!failure) return null;
    const updated = { ...failure, ...updates };
    SubscriptionRepository.memoryStore.set(id, updated);
    return { ...updated };
  }

  public async clear(): Promise<void> {
    SubscriptionRepository.memoryStore.clear();
  }
}
