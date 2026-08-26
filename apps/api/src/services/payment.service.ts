import { Payment } from '@razorrecover/shared-types';
import { PaymentRepository } from '../repositories/payment.repository';

export class PaymentService {
  private repo = new PaymentRepository();

  public async createPayment(data: Partial<Payment>): Promise<Payment> {
    return this.repo.create(data);
  }

  public async getPaymentById(id: string): Promise<Payment | null> {
    return this.repo.findById(id);
  }
}
