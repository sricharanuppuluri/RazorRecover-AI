import { Customer } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class CustomerRepository {
  private static memoryStore = new Map<string, Customer>();

  public async create(customer: Partial<Customer>): Promise<Customer> {
    const record: Customer = {
      id: customer.id || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      merchant_id: customer.merchant_id || 'mch_test_01',
      external_customer_id: customer.external_customer_id || `ext_cust_${Date.now()}`,
      email_hash: customer.email_hash,
      phone_hash: customer.phone_hash,
      first_seen_at: new Date().toISOString(),
      successful_payment_count: customer.successful_payment_count || 0,
      failed_payment_count: customer.failed_payment_count || 0,
      total_success_value: customer.total_success_value || 0,
      total_failed_value: customer.total_failed_value || 0,
      contact_opt_in: customer.contact_opt_in !== undefined ? customer.contact_opt_in : true,
      risk_flags: customer.risk_flags || []
    };

    CustomerRepository.memoryStore.set(record.id, record);
    if (record.merchant_id && record.external_customer_id) {
      CustomerRepository.memoryStore.set(`ext_${record.merchant_id}_${record.external_customer_id}`, record);
    }

    try {
      const pool = getDbPool();
      const query = `
        INSERT INTO customers (
          id, merchant_id, external_customer_id, email_hash, phone_hash,
          successful_payment_count, failed_payment_count, total_success_value, total_failed_value,
          contact_opt_in, risk_flags
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
      `;
      const values = [
        record.id,
        record.merchant_id,
        record.external_customer_id,
        record.email_hash || null,
        record.phone_hash || null,
        record.successful_payment_count,
        record.failed_payment_count,
        record.total_success_value,
        record.total_failed_value,
        record.contact_opt_in,
        record.risk_flags,
      ];

      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (err: any) {
      return record;
    }
  }

  public async findById(id: string): Promise<Customer | null> {
    if (CustomerRepository.memoryStore.has(id)) {
      return CustomerRepository.memoryStore.get(id)!;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
      if (rows[0]) {
        CustomerRepository.memoryStore.set(rows[0].id, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }

  public async findByExternalId(merchantId: string, externalId: string): Promise<Customer | null> {
    const key = `ext_${merchantId}_${externalId}`;
    if (CustomerRepository.memoryStore.has(key)) {
      return CustomerRepository.memoryStore.get(key)!;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query(
        'SELECT * FROM customers WHERE merchant_id = $1 AND external_customer_id = $2',
        [merchantId, externalId]
      );
      if (rows[0]) {
        CustomerRepository.memoryStore.set(key, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }
}

