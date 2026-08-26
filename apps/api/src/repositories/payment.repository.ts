import { Payment, PaymentStatus } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class PaymentRepository {
  private static memoryStore = new Map<string, Payment>();

  public async create(payment: Partial<Payment>): Promise<Payment> {
    const record: Payment = {
      id: payment.id || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      merchant_id: payment.merchant_id || 'mch_test_01',
      razorpay_payment_id: payment.razorpay_payment_id || `pay_mock_${Date.now()}`,
      razorpay_order_id: payment.razorpay_order_id || `order_mock_${Date.now()}`,
      customer_id: payment.customer_id || 'cust_01',
      amount: payment.amount || 0,
      currency: payment.currency || 'INR',
      method: payment.method,
      bank: payment.bank,
      status: payment.status || 'CREATED',
      error_code: payment.error_code,
      error_description: payment.error_description,
      error_source: payment.error_source,
      error_step: payment.error_step,
      error_reason: payment.error_reason,
      created_at: new Date().toISOString(),
      authorized_at: payment.authorized_at,
      captured_at: payment.captured_at,
      failure_count: payment.failure_count || 0,
      recovery_case_id: payment.recovery_case_id
    };

    PaymentRepository.memoryStore.set(record.id, record);
    if (record.razorpay_payment_id) {
      PaymentRepository.memoryStore.set(record.razorpay_payment_id, record);
    }
    if (record.razorpay_order_id) {
      PaymentRepository.memoryStore.set(`order_${record.razorpay_order_id}`, record);
    }

    try {
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
        record.id,
        record.merchant_id,
        record.razorpay_payment_id || null,
        record.razorpay_order_id || null,
        record.customer_id,
        record.amount,
        record.currency || 'INR',
        record.method || null,
        record.bank || null,
        record.status || 'CREATED',
        record.error_code || null,
        record.error_description || null,
        record.error_source || null,
        record.error_step || null,
        record.error_reason || null,
        record.failure_count || 0,
        record.recovery_case_id || null,
      ];

      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (err: any) {
      return record;
    }
  }

  public async findById(id: string): Promise<Payment | null> {
    if (PaymentRepository.memoryStore.has(id)) {
      return PaymentRepository.memoryStore.get(id)!;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
      if (rows[0]) {
        PaymentRepository.memoryStore.set(rows[0].id, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }

  public async findByRazorpayPaymentId(razorpayPaymentId: string): Promise<Payment | null> {
    if (PaymentRepository.memoryStore.has(razorpayPaymentId)) {
      return PaymentRepository.memoryStore.get(razorpayPaymentId)!;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM payments WHERE razorpay_payment_id = $1', [razorpayPaymentId]);
      if (rows[0]) {
        PaymentRepository.memoryStore.set(razorpayPaymentId, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }

  public async findByRazorpayOrderId(razorpayOrderId: string): Promise<Payment | null> {
    const key = `order_${razorpayOrderId}`;
    if (PaymentRepository.memoryStore.has(key)) {
      return PaymentRepository.memoryStore.get(key)!;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM payments WHERE razorpay_order_id = $1 ORDER BY created_at DESC LIMIT 1', [razorpayOrderId]);
      if (rows[0]) {
        PaymentRepository.memoryStore.set(key, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }

  public async updatePaymentState(
    id: string,
    updates: {
      status?: PaymentStatus;
      authorized_at?: string;
      captured_at?: string;
      failure_count?: number;
      error_code?: string;
      error_description?: string;
      error_source?: string;
      error_step?: string;
      error_reason?: string;
      method?: string;
      bank?: string;
    }
  ): Promise<Payment | null> {
    let record = PaymentRepository.memoryStore.get(id);
    if (record) {
      if (updates.status) record.status = updates.status;
      if (updates.authorized_at) record.authorized_at = updates.authorized_at;
      if (updates.captured_at) record.captured_at = updates.captured_at;
      if (updates.failure_count !== undefined) record.failure_count = updates.failure_count;
      if (updates.error_code) record.error_code = updates.error_code;
      if (updates.error_description) record.error_description = updates.error_description;
      if (updates.error_source) record.error_source = updates.error_source;
      if (updates.error_step) record.error_step = updates.error_step;
      if (updates.error_reason) record.error_reason = updates.error_reason;
      if (updates.method) record.method = updates.method;
      if (updates.bank) record.bank = updates.bank;

      PaymentRepository.memoryStore.set(id, record);
      if (record.razorpay_payment_id) {
        PaymentRepository.memoryStore.set(record.razorpay_payment_id, record);
      }
    }

    try {
      const pool = getDbPool();
      const query = `
        UPDATE payments
        SET status = COALESCE($1, status),
            authorized_at = COALESCE($2, authorized_at),
            captured_at = COALESCE($3, captured_at),
            failure_count = COALESCE($4, failure_count),
            error_code = COALESCE($5, error_code),
            error_description = COALESCE($6, error_description),
            error_source = COALESCE($7, error_source),
            error_step = COALESCE($8, error_step),
            error_reason = COALESCE($9, error_reason),
            method = COALESCE($10, method),
            bank = COALESCE($11, bank)
        WHERE id = $12
        RETURNING *;
      `;
      const values = [
        updates.status || null,
        updates.authorized_at || null,
        updates.captured_at || null,
        updates.failure_count !== undefined ? updates.failure_count : null,
        updates.error_code || null,
        updates.error_description || null,
        updates.error_source || null,
        updates.error_step || null,
        updates.error_reason || null,
        updates.method || null,
        updates.bank || null,
        id
      ];

      const { rows } = await pool.query(query, values);
      return rows[0] || record || null;
    } catch (err: any) {
      return record || null;
    }
  }

  public async getRecentFailureRates(bank?: string, method?: string): Promise<{ bankFailureRate: number; methodFailureRate: number }> {
    let bankTotal = 0;
    let bankFailed = 0;
    let methodTotal = 0;
    let methodFailed = 0;

    // First check memory store
    for (const payment of PaymentRepository.memoryStore.values()) {
      if (bank && payment.bank?.toUpperCase() === bank.toUpperCase()) {
        bankTotal++;
        if (payment.status === 'FAILED') bankFailed++;
      }
      if (method && payment.method?.toUpperCase() === method.toUpperCase()) {
        methodTotal++;
        if (payment.status === 'FAILED') methodFailed++;
      }
    }

    try {
      const pool = getDbPool();
      if (bank) {
        const { rows } = await pool.query(
          `SELECT 
             COUNT(*) as total,
             COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed
           FROM payments
           WHERE UPPER(bank) = UPPER($1) AND created_at >= NOW() - INTERVAL '24 hours'`,
          [bank]
        );
        if (rows[0] && parseInt(rows[0].total) > 0) {
          bankTotal += parseInt(rows[0].total);
          bankFailed += parseInt(rows[0].failed);
        }
      }

      if (method) {
        const { rows } = await pool.query(
          `SELECT 
             COUNT(*) as total,
             COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed
           FROM payments
           WHERE UPPER(method) = UPPER($1) AND created_at >= NOW() - INTERVAL '24 hours'`,
          [method]
        );
        if (rows[0] && parseInt(rows[0].total) > 0) {
          methodTotal += parseInt(rows[0].total);
          methodFailed += parseInt(rows[0].failed);
        }
      }
    } catch (err: any) {}

    return {
      bankFailureRate: bankTotal > 0 ? bankFailed / bankTotal : 0,
      methodFailureRate: methodTotal > 0 ? methodFailed / methodTotal : 0
    };
  }

  public async findByMerchantId(merchantId: string): Promise<Payment[]> {
    const unique = new Map<string, Payment>();
    for (const p of PaymentRepository.memoryStore.values()) {
      if (p.merchant_id === merchantId) {
        unique.set(p.id, p);
      }
    }
    return Array.from(unique.values());
  }

  public async clear(): Promise<void> {
    PaymentRepository.memoryStore.clear();
  }
}


