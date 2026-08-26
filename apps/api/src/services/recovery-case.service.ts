import { RecoveryCase } from '@razorrecover/shared-types';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';

export class RecoveryCaseService {
  private repo = new RecoveryCaseRepository();

  public async createRecoveryCase(data: Partial<RecoveryCase>): Promise<RecoveryCase> {
    return this.repo.create(data);
  }

  public async getRecoveryCaseById(id: string): Promise<RecoveryCase | null> {
    return this.repo.findById(id);
  }
}
