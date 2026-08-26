import { PromiseToPay, PromiseStatus } from '@razorrecover/shared-types';

export class PromiseToPayRepository {
  private static store: Map<string, PromiseToPay> = new Map();

  public async create(promise: Omit<PromiseToPay, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromiseToPay> {
    const id = `ptp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const record: PromiseToPay = {
      ...promise,
      id,
      createdAt: now,
      updatedAt: now,
    };
    PromiseToPayRepository.store.set(id, record);
    return record;
  }

  public async findById(id: string, merchantId: string): Promise<PromiseToPay | null> {
    const record = PromiseToPayRepository.store.get(id);
    if (!record || record.merchantId !== merchantId) {
      return null;
    }
    return record;
  }

  public async findByCaseId(recoveryCaseId: string, merchantId: string): Promise<PromiseToPay[]> {
    return Array.from(PromiseToPayRepository.store.values()).filter(
      (p) => p.merchantId === merchantId && p.recoveryCaseId === recoveryCaseId
    );
  }

  public async listByMerchant(merchantId: string): Promise<PromiseToPay[]> {
    return Array.from(PromiseToPayRepository.store.values()).filter(
      (p) => p.merchantId === merchantId
    );
  }

  public async updateStatus(id: string, merchantId: string, status: PromiseStatus): Promise<PromiseToPay | null> {
    const record = await this.findById(id, merchantId);
    if (!record) return null;

    record.status = status;
    record.updatedAt = new Date().toISOString();
    PromiseToPayRepository.store.set(id, record);
    return record;
  }

  public async clear(): Promise<void> {
    PromiseToPayRepository.store.clear();
  }
}
