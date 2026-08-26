import { Payment } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class PaymentRepository {
  public async create(payment: Partial<Payment>): Promise<Payment> {
    const pool = getDbPool();
    const query = `
      INSERT INTO payments (
        id, merchant_id, razorpay_payment_id, razorpay_order_id, customer_id, amount, currency,
        method, bank, status, error_code, error_description, error_source, error_step, error_reason,
        failure_count, recovery_case_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *;
    `;
    const values = [
      payment.id,
      payment.merchant_id,
      payment.razorpay_payment_id || null,
      payment.razorpay_order_id || null,
      payment.customer_id,
      payment.amount,
      payment.currency || 'INR',
      payment.method || null,
      payment.bank || null,
      payment.status || 'CREATED',
      payment.error_code || null,
      payment.error_description || null,
      payment.error_source || null,
      payment.error_step || null,
      payment.error_reason || null,
      payment.failure_count || 0,
      payment.recovery_case_id || null,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  public async findById(id: string): Promise<Payment | null> {
    const pool = getDbPool();
    const { rows } = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
    return rows[0] || null;
  }
}
