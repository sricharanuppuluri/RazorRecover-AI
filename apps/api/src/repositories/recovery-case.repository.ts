import { RecoveryCase, AllowedAction, CaseStatus } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class RecoveryCaseRepository {
  private static memoryStore = new Map<string, RecoveryCase>();
  private static seeded = false;

  private static seedInitialDemoData() {
    if (RecoveryCaseRepository.seeded || RecoveryCaseRepository.memoryStore.size > 0) {
      return;
    }
    RecoveryCaseRepository.seeded = true;

    const demoCases: Partial<RecoveryCase>[] = [
      {
        id: 'rc_demo_001',
        merchant_id: 'mch_test_01',
        order_id: 'ord_demo_001',
        payment_id: 'pay_demo_001',
        case_type: 'PAYMENT_FAILURE',
        amount_at_risk: 750000, // ₹7,500.00
        recoverability_score: 0.85,
        expected_recovery_value: 637500,
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        diagnosis_confidence: 0.92,
        priority_score: 82,
        recommended_action: 'WAIT_AND_RETRY',
        action_confidence: 0.88,
        policy_decision: 'APPROVED',
        status: 'WAITING_FOR_OUTCOME',
        retry_count: 1,
        notification_count: 0,
        started_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 22 * 3600 * 1000).toISOString(),
      },
      {
        id: 'rc_demo_002',
        merchant_id: 'mch_test_01',
        order_id: 'ord_demo_002',
        payment_id: 'pay_demo_002',
        case_type: 'PAYMENT_FAILURE',
        amount_at_risk: 12500000, // ₹1,25,000.00
        recoverability_score: 0.65,
        expected_recovery_value: 8125000,
        diagnosis: 'UNKNOWN_OR_AMBIGUOUS',
        diagnosis_confidence: 0.55,
        priority_score: 95,
        recommended_action: 'ESCALATE_HUMAN',
        action_confidence: 0.70,
        policy_decision: 'HUMAN_REQUIRED',
        status: 'HUMAN_REVIEW',
        retry_count: 0,
        notification_count: 0,
        started_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
      },
      {
        id: 'rc_demo_003',
        merchant_id: 'mch_test_01',
        order_id: 'ord_demo_003',
        payment_id: 'pay_demo_003',
        case_type: 'PAYMENT_FAILURE',
        amount_at_risk: 250000, // ₹2,500.00
        recoverability_score: 0.78,
        expected_recovery_value: 195000,
        diagnosis: 'CUSTOMER_AUTHENTICATION_ISSUE',
        diagnosis_confidence: 0.89,
        priority_score: 71,
        recommended_action: 'SEND_RECOVERY_LINK',
        action_confidence: 0.85,
        policy_decision: 'APPROVED',
        status: 'RECOVERED',
        retry_count: 0,
        notification_count: 1,
        started_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        recovered_amount: 250000,
        closed_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        close_reason: 'PAYMENT_CAPTURED'
      },
      {
        id: 'rc_demo_004',
        merchant_id: 'mch_test_01',
        order_id: 'ord_demo_004',
        payment_id: 'pay_demo_004',
        case_type: 'PAYMENT_FAILURE',
        amount_at_risk: 180000, // ₹1,800.00
        recoverability_score: 0.12,
        expected_recovery_value: 21600,
        diagnosis: 'REPEATED_FAILURE',
        diagnosis_confidence: 0.95,
        priority_score: 15,
        recommended_action: 'STOP',
        action_confidence: 0.96,
        policy_decision: 'DENIED',
        status: 'STOPPED',
        retry_count: 3,
        notification_count: 1,
        started_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        expires_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        closed_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        close_reason: 'RETRY_LIMIT_EXCEEDED'
      },
      {
        id: 'rc_demo_005',
        merchant_id: 'mch_test_01',
        order_id: 'ord_demo_005',
        payment_id: 'pay_demo_005',
        case_type: 'PAYMENT_FAILURE',
        amount_at_risk: 420000, // ₹4,200.00
        recoverability_score: 0.60,
        expected_recovery_value: 252000,
        diagnosis: 'INSUFFICIENT_FUNDS',
        diagnosis_confidence: 0.82,
        priority_score: 64,
        recommended_action: 'OFFER_ALTERNATE_PAYMENT',
        action_confidence: 0.79,
        policy_decision: 'APPROVED',
        status: 'ACTION_SENT',
        retry_count: 0,
        notification_count: 1,
        started_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 21 * 3600 * 1000).toISOString(),
      },
      {
        id: 'rc_demo_006',
        merchant_id: 'mch_test_01',
        order_id: 'ord_demo_006',
        payment_id: 'pay_demo_006',
        case_type: 'CHECKOUT_ABANDONMENT',
        amount_at_risk: 150000, // ₹1,500.00
        recoverability_score: 0.70,
        expected_recovery_value: 105000,
        diagnosis: 'CHECKOUT_ABANDONMENT',
        diagnosis_confidence: 0.88,
        priority_score: 58,
        recommended_action: 'SEND_REMINDER',
        action_confidence: 0.82,
        policy_decision: 'APPROVED',
        status: 'ACTION_PENDING',
        retry_count: 0,
        notification_count: 0,
        started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 23.5 * 3600 * 1000).toISOString(),
      },
      {
        id: 'rc_demo_007',
        merchant_id: 'mch_test_01',
        order_id: 'ord_demo_007',
        payment_id: 'pay_demo_007',
        case_type: 'PAYMENT_FAILURE',
        amount_at_risk: 950000, // ₹9,500.00
        recoverability_score: 0.88,
        expected_recovery_value: 836000,
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        diagnosis_confidence: 0.94,
        priority_score: 89,
        recommended_action: 'WAIT_AND_RETRY',
        action_confidence: 0.91,
        policy_decision: 'APPROVED',
        status: 'RECOVERED',
        retry_count: 1,
        notification_count: 0,
        started_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
        recovered_amount: 950000,
        closed_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        close_reason: 'PAYMENT_CAPTURED'
      }
    ];

    for (const c of demoCases) {
      const record: RecoveryCase = {
        id: c.id!,
        merchant_id: c.merchant_id || 'mch_test_01',
        order_id: c.order_id!,
        payment_id: c.payment_id,
        case_type: c.case_type || 'PAYMENT_FAILURE',
        amount_at_risk: c.amount_at_risk || 0,
        recoverability_score: c.recoverability_score,
        expected_recovery_value: c.expected_recovery_value,
        diagnosis: c.diagnosis,
        diagnosis_confidence: c.diagnosis_confidence,
        priority_score: c.priority_score,
        recommended_action: c.recommended_action,
        action_confidence: c.action_confidence,
        policy_decision: c.policy_decision,
        status: c.status || 'NEW',
        retry_count: c.retry_count || 0,
        notification_count: c.notification_count || 0,
        started_at: c.started_at || new Date().toISOString(),
        expires_at: c.expires_at || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        recovered_amount: c.recovered_amount || 0,
        closed_at: c.closed_at,
        close_reason: c.close_reason
      };
      RecoveryCaseRepository.memoryStore.set(record.id, record);
    }
  }

  public async create(rc: Partial<RecoveryCase>): Promise<RecoveryCase> {
    RecoveryCaseRepository.seedInitialDemoData();

    const record: RecoveryCase = {
      id: rc.id || `rc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      merchant_id: rc.merchant_id || 'mch_test_01',
      order_id: rc.order_id!,
      payment_id: rc.payment_id,
      case_type: rc.case_type || 'PAYMENT_FAILURE',
      amount_at_risk: rc.amount_at_risk || 0,
      recoverability_score: rc.recoverability_score,
      expected_recovery_value: rc.expected_recovery_value,
      diagnosis: rc.diagnosis,
      diagnosis_confidence: rc.diagnosis_confidence,
      priority_score: rc.priority_score,
      recommended_action: rc.recommended_action,
      action_confidence: rc.action_confidence,
      policy_decision: rc.policy_decision,
      status: rc.status || 'NEW',
      retry_count: rc.retry_count || 0,
      notification_count: rc.notification_count || 0,
      started_at: rc.started_at || new Date().toISOString(),
      expires_at: rc.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      recovered_amount: rc.recovered_amount || 0,
      closed_at: rc.closed_at,
      close_reason: rc.close_reason
    };

    RecoveryCaseRepository.memoryStore.set(record.id, record);

    try {
      const pool = getDbPool();
      const query = `
        INSERT INTO recovery_cases (
          id, merchant_id, order_id, payment_id, case_type, amount_at_risk,
          recoverability_score, expected_recovery_value, diagnosis, diagnosis_confidence,
          priority_score, recommended_action, action_confidence, policy_decision, status,
          retry_count, notification_count, started_at, expires_at, recovered_amount, closed_at, close_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), $18, $19, $20, $21)
        RETURNING *;
      `;
      const values = [
        record.id,
        record.merchant_id,
        record.order_id,
        record.payment_id || null,
        record.case_type,
        record.amount_at_risk,
        record.recoverability_score !== undefined ? record.recoverability_score : null,
        record.expected_recovery_value !== undefined ? record.expected_recovery_value : null,
        record.diagnosis || null,
        record.diagnosis_confidence !== undefined ? record.diagnosis_confidence : null,
        record.priority_score !== undefined ? record.priority_score : null,
        record.recommended_action || null,
        record.action_confidence !== undefined ? record.action_confidence : null,
        record.policy_decision || null,
        record.status,
        record.retry_count,
        record.notification_count,
        record.expires_at,
        record.recovered_amount,
        record.closed_at || null,
        record.close_reason || null,
      ];

      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (err: any) {
      return record;
    }
  }

  public async findById(id: string): Promise<RecoveryCase | null> {
    RecoveryCaseRepository.seedInitialDemoData();
    if (RecoveryCaseRepository.memoryStore.has(id)) {
      return RecoveryCaseRepository.memoryStore.get(id)!;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM recovery_cases WHERE id = $1', [id]);
      if (rows[0]) {
        RecoveryCaseRepository.memoryStore.set(rows[0].id, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }

  public async findByPaymentId(paymentId: string): Promise<RecoveryCase | null> {
    RecoveryCaseRepository.seedInitialDemoData();

    for (const item of RecoveryCaseRepository.memoryStore.values()) {
      if (item.payment_id === paymentId) {
        return item;
      }
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM recovery_cases WHERE payment_id = $1 ORDER BY started_at DESC LIMIT 1', [paymentId]);
      if (rows[0]) {
        RecoveryCaseRepository.memoryStore.set(rows[0].id, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }

  public async findByOrderId(orderId: string): Promise<RecoveryCase | null> {
    RecoveryCaseRepository.seedInitialDemoData();

    for (const item of RecoveryCaseRepository.memoryStore.values()) {
      if (item.order_id === orderId) {
        return item;
      }
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM recovery_cases WHERE order_id = $1 ORDER BY started_at DESC LIMIT 1', [orderId]);
      if (rows[0]) {
        RecoveryCaseRepository.memoryStore.set(rows[0].id, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    return null;
  }

  public async findAll(options?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }): Promise<{ cases: RecoveryCase[]; total: number; page: number; limit: number }> {
    RecoveryCaseRepository.seedInitialDemoData();

    let allCases: RecoveryCase[] = [];

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM recovery_cases ORDER BY started_at DESC');
      if (rows && rows.length > 0) {
        allCases = rows;
      } else {
        allCases = Array.from(RecoveryCaseRepository.memoryStore.values()).filter(
          c => !c.id.startsWith('pay_') && !c.id.startsWith('ord_')
        );
      }
    } catch (err) {
      allCases = Array.from(RecoveryCaseRepository.memoryStore.values()).filter(
        c => !c.id.startsWith('pay_') && !c.id.startsWith('ord_')
      );
    }

    // Filter by status
    if (options?.status && options.status !== 'ALL') {
      allCases = allCases.filter(c => c.status === options.status);
    }

    // Filter by search string (matches ID, order_id, payment_id, diagnosis)
    if (options?.search) {
      const term = options.search.toLowerCase();
      allCases = allCases.filter(
        c =>
          c.id.toLowerCase().includes(term) ||
          c.order_id.toLowerCase().includes(term) ||
          (c.payment_id && c.payment_id.toLowerCase().includes(term)) ||
          (c.diagnosis && c.diagnosis.toLowerCase().includes(term))
      );
    }

    // Sorting
    allCases.sort((a, b) => {
      if (options?.sortBy === 'expected_recovery_value') {
        return (b.expected_recovery_value || 0) - (a.expected_recovery_value || 0);
      }
      if (options?.sortBy === 'priority_score') {
        return (b.priority_score || 0) - (a.priority_score || 0);
      }
      if (options?.sortBy === 'amount_at_risk') {
        return (b.amount_at_risk || 0) - (a.amount_at_risk || 0);
      }
      // Default sort: started_at DESC (or expected_recovery_value DESC)
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    });

    const total = allCases.length;
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const startIndex = (page - 1) * limit;
    const paginatedCases = allCases.slice(startIndex, startIndex + limit);

    return {
      cases: paginatedCases,
      total,
      page,
      limit
    };
  }

  public async updateDeterministicAnalysis(
    id: string,
    updates: {
      amount_at_risk: number;
      recoverability_score: number;
      expected_recovery_value: number;
      diagnosis: string;
      diagnosis_confidence: number;
      priority_score: number;
      status?: RecoveryCase['status'];
    }
  ): Promise<RecoveryCase | null> {
    RecoveryCaseRepository.seedInitialDemoData();
    let record = RecoveryCaseRepository.memoryStore.get(id);
    if (record) {
      record.amount_at_risk = updates.amount_at_risk;
      record.recoverability_score = updates.recoverability_score;
      record.expected_recovery_value = updates.expected_recovery_value;
      record.diagnosis = updates.diagnosis;
      record.diagnosis_confidence = updates.diagnosis_confidence;
      record.priority_score = updates.priority_score;
      if (updates.status) record.status = updates.status;

      RecoveryCaseRepository.memoryStore.set(id, record);
    }

    try {
      const pool = getDbPool();
      const query = `
        UPDATE recovery_cases
        SET amount_at_risk = $1,
            recoverability_score = $2,
            expected_recovery_value = $3,
            diagnosis = $4,
            diagnosis_confidence = $5,
            priority_score = $6,
            status = COALESCE($7, status)
        WHERE id = $8
        RETURNING *;
      `;
      const values = [
        updates.amount_at_risk,
        updates.recoverability_score,
        updates.expected_recovery_value,
        updates.diagnosis,
        updates.diagnosis_confidence,
        updates.priority_score,
        updates.status || null,
        id
      ];

      const { rows } = await pool.query(query, values);
      return rows[0] || record || null;
    } catch (err: any) {
      return record || null;
    }
  }

  public async updateStatus(
    id: string,
    status: RecoveryCase['status'],
    extra?: { closedAt?: string; closeReason?: string; recoveredAmount?: number }
  ): Promise<RecoveryCase | null> {
    RecoveryCaseRepository.seedInitialDemoData();
    let record = RecoveryCaseRepository.memoryStore.get(id);
    if (record) {
      record.status = status;
      if (extra?.closedAt) record.closed_at = extra.closedAt;
      if (extra?.closeReason) record.close_reason = extra.closeReason;
      if (extra?.recoveredAmount !== undefined) record.recovered_amount = extra.recoveredAmount;
      RecoveryCaseRepository.memoryStore.set(id, record);
    }

    try {
      const pool = getDbPool();
      const query = `
        UPDATE recovery_cases
        SET status = $1,
            closed_at = COALESCE($2, closed_at),
            close_reason = COALESCE($3, close_reason),
            recovered_amount = COALESCE($4, recovered_amount)
        WHERE id = $5
        RETURNING *;
      `;
      const values = [status, extra?.closedAt || null, extra?.closeReason || null, extra?.recoveredAmount ?? null, id];
      const { rows } = await pool.query(query, values);
      return rows[0] || record || null;
    } catch (err: any) {
      return record || null;
    }
  }

  public async incrementRetryCount(id: string): Promise<RecoveryCase | null> {
    RecoveryCaseRepository.seedInitialDemoData();
    let record = RecoveryCaseRepository.memoryStore.get(id);
    if (record) {
      record.retry_count = (record.retry_count || 0) + 1;
      RecoveryCaseRepository.memoryStore.set(id, record);
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('UPDATE recovery_cases SET retry_count = retry_count + 1 WHERE id = $1 RETURNING *', [id]);
      return rows[0] || record || null;
    } catch (err: any) {
      return record || null;
    }
  }

  public async incrementNotificationCount(id: string): Promise<RecoveryCase | null> {
    RecoveryCaseRepository.seedInitialDemoData();
    let record = RecoveryCaseRepository.memoryStore.get(id);
    if (record) {
      record.notification_count = (record.notification_count || 0) + 1;
      RecoveryCaseRepository.memoryStore.set(id, record);
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('UPDATE recovery_cases SET notification_count = notification_count + 1 WHERE id = $1 RETURNING *', [id]);
      return rows[0] || record || null;
    } catch (err: any) {
      return record || null;
    }
  }
}
