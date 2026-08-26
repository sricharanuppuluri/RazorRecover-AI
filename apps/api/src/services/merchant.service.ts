import { Merchant } from '@razorrecover/shared-types';
import { MerchantRepository } from '../repositories/merchant.repository';

export class MerchantService {
  private repo = new MerchantRepository();

  public async createMerchant(data: Partial<Merchant>): Promise<Merchant> {
    return this.repo.create(data);
  }

  public async getMerchantById(id: string): Promise<Merchant | null> {
    return this.repo.findById(id);
  }
}
