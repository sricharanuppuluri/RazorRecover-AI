import { Order } from '@razorrecover/shared-types';
import { OrderRepository } from '../repositories/order.repository';

export class OrderService {
  private repo = new OrderRepository();

  public async createOrder(data: Partial<Order>): Promise<Order> {
    return this.repo.create(data);
  }

  public async getOrderById(id: string): Promise<Order | null> {
    return this.repo.findById(id);
  }
}
