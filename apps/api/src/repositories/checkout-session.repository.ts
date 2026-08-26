import { CheckoutSession } from '@razorrecover/shared-types';

export class CheckoutSessionRepository {
  private static memoryStore: Map<string, CheckoutSession> = new Map();

  public async create(session: CheckoutSession): Promise<CheckoutSession> {
    CheckoutSessionRepository.memoryStore.set(session.id, { ...session });
    return { ...session };
  }

  public async findById(id: string): Promise<CheckoutSession | null> {
    const session = CheckoutSessionRepository.memoryStore.get(id);
    return session ? { ...session } : null;
  }

  public async findByMerchant(merchantId: string): Promise<CheckoutSession[]> {
    return Array.from(CheckoutSessionRepository.memoryStore.values())
      .filter((s) => s.merchantId === merchantId);
  }

  public async findByOrderId(orderId: string): Promise<CheckoutSession | null> {
    for (const session of CheckoutSessionRepository.memoryStore.values()) {
      if (session.orderId === orderId) {
        return { ...session };
      }
    }
    return null;
  }

  public async update(id: string, updates: Partial<CheckoutSession>): Promise<CheckoutSession | null> {
    const session = CheckoutSessionRepository.memoryStore.get(id);
    if (!session) return null;
    const updated = { ...session, ...updates };
    CheckoutSessionRepository.memoryStore.set(id, updated);
    return { ...updated };
  }

  public async clear(): Promise<void> {
    CheckoutSessionRepository.memoryStore.clear();
  }
}
