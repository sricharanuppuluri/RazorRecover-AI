import { VoiceSession } from '@razorrecover/shared-types';

export class VoiceSessionRepository {
  private static memoryStore = new Map<string, VoiceSession>();

  public async create(session: VoiceSession): Promise<VoiceSession> {
    VoiceSessionRepository.memoryStore.set(session.id, { ...session });
    return session;
  }

  public async findById(id: string): Promise<VoiceSession | null> {
    const record = VoiceSessionRepository.memoryStore.get(id);
    return record ? { ...record } : null;
  }

  public async findByMerchant(merchantId: string): Promise<VoiceSession[]> {
    return Array.from(VoiceSessionRepository.memoryStore.values())
      .filter((s) => s.merchantId === merchantId)
      .map((s) => ({ ...s }));
  }

  public async update(session: VoiceSession): Promise<VoiceSession> {
    VoiceSessionRepository.memoryStore.set(session.id, { ...session });
    return session;
  }

  public async clear(): Promise<void> {
    VoiceSessionRepository.memoryStore.clear();
  }
}
