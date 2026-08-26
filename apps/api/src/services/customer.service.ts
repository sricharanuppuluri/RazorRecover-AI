import { Customer } from '@razorrecover/shared-types';
import { CustomerRepository } from '../repositories/customer.repository';

export class CustomerService {
  private repo = new CustomerRepository();

  public async createCustomer(data: Partial<Customer>): Promise<Customer> {
    return this.repo.create(data);
  }

  public async getCustomerById(id: string): Promise<Customer | null> {
    return this.repo.findById(id);
  }
}
