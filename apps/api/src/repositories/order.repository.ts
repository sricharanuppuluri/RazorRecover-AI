import { Order, OrderStatus } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class OrderRepository {
  private static memoryStore = new Map<string, Order>();

  public async create(order: Partial<Order>): Promise<Order> {
    const record: Order = {
      id: order.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      merchant_id: order.merchant_id || 'mch_test_01',
      razorpay_order_id: order.razorpay_order_id || `order_mock_${Date.now()}`,
      customer_id: order.customer_id || 'cust_01',
      amount: order.amount || 0,
      currency: order.currency || 'INR',
      status: order.status || 'CREATED',
      product_category: order.product_category,
      created_at: new Date().toISOString()
    };

    OrderRepository.memoryStore.set(record.id, record);
    if (record.razorpay_order_id) {
      OrderRepository.memoryStore.set(record.razorpay_order_id, record);
    }

    try {
      const pool = getDbPool();
      const query = `
        INSERT INTO orders (
          id, merchant_id, razorpay_order_id, customer_id, amount, currency, status, product_category
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const values = [
        record.id,
        record.merchant_id,
        record.razorpay_order_id || null,
        record.customer_id,
        record.amount,
        record.currency || 'INR',
        record.status || 'CREATED',
        record.product_category || null,
      ];

      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (err: any) {
      return record;
    }
  }

  public async findById(id: string): Promise<Order | null> {
    if (OrderRepository.memoryStore.has(id)) {
      return OrderRepository.memoryStore.get(id)!;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (rows[0]) {
        OrderRepository.memoryStore.set(rows[0].id, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }

  public async findByRazorpayOrderId(razorpayOrderId: string): Promise<Order | null> {
    if (OrderRepository.memoryStore.has(razorpayOrderId)) {
      return OrderRepository.memoryStore.get(razorpayOrderId)!;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM orders WHERE razorpay_order_id = $1', [razorpayOrderId]);
      if (rows[0]) {
        OrderRepository.memoryStore.set(razorpayOrderId, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }

  public async updateStatus(id: string, status: OrderStatus, paidAt?: string): Promise<Order | null> {
    let record = OrderRepository.memoryStore.get(id);
    if (record) {
      record.status = status;
      if (paidAt) {
        record.paid_at = paidAt;
      }
      OrderRepository.memoryStore.set(id, record);
      if (record.razorpay_order_id) {
        OrderRepository.memoryStore.set(record.razorpay_order_id, record);
      }
    }

    try {
      const pool = getDbPool();
      let query: string;
      let values: any[];

      if (status === 'PAID') {
        query = `
          UPDATE orders
          SET status = $1, paid_at = COALESCE($2, NOW())
          WHERE id = $3
          RETURNING *;
        `;
        values = [status, paidAt || null, id];
      } else {
        query = `
          UPDATE orders
          SET status = $1
          WHERE id = $2
          RETURNING *;
        `;
        values = [status, id];
      }

      const { rows } = await pool.query(query, values);
      return rows[0] || record || null;
    } catch (err: any) {
      return record || null;
    }
  }
}
