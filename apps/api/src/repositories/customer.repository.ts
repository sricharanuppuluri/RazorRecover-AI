import { Customer } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class CustomerRepository {
  public async create(customer: Partial<Customer>): Promise<Customer> {
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
      customer.id,
      customer.merchant_id,
      customer.external_customer_id,
      customer.email_hash || null,
      customer.phone_hash || null,
      customer.successful_payment_count || 0,
      customer.failed_payment_count || 0,
      customer.total_success_value || 0,
      customer.total_failed_value || 0,
      customer.contact_opt_in !== undefined ? customer.contact_opt_in : true,
      customer.risk_flags || [],
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  public async findById(id: string): Promise<Customer | null> {
    const pool = getDbPool();
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    return rows[0] || null;
  }

  public async findByExternalId(merchantId: string, externalId: string): Promise<Customer | null> {
    const pool = getDbPool();
    const { rows } = await pool.query(
      'SELECT * FROM customers WHERE merchant_id = $1 AND external_customer_id = $2',
      [merchantId, externalId]
    );
    return rows[0] || null;
  }
}
