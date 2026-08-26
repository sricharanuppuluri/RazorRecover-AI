import { Order } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class OrderRepository {
  public async create(order: Partial<Order>): Promise<Order> {
    const pool = getDbPool();
    const query = `
      INSERT INTO orders (
        id, merchant_id, razorpay_order_id, customer_id, amount, currency, status, product_category
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [
      order.id,
      order.merchant_id,
      order.razorpay_order_id || null,
      order.customer_id,
      order.amount,
      order.currency || 'INR',
      order.status || 'CREATED',
      order.product_category || null,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  public async findById(id: string): Promise<Order | null> {
    const pool = getDbPool();
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    return rows[0] || null;
  }
}
