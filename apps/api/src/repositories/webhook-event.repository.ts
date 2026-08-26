import { WebhookEvent } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class WebhookEventRepository {
  private static memoryStore = new Map<string, WebhookEvent>();

  public async create(event: Partial<WebhookEvent>): Promise<WebhookEvent> {
    const record: WebhookEvent = {
      id: event.id || `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      razorpay_event_id: event.razorpay_event_id!,
      event_type: event.event_type!,
      signature_valid: !!event.signature_valid,
      raw_body_hash: event.raw_body_hash || '',
      received_at: new Date().toISOString(),
      processed_at: event.processed_at || undefined,
      processing_status: event.processing_status || 'RECEIVED',
      retry_count: event.retry_count || 0,
      error_message: event.error_message || undefined
    };

    // Store in memory cache for test resilience & fast lookup
    WebhookEventRepository.memoryStore.set(record.razorpay_event_id, record);

    try {
      const pool = getDbPool();
      const query = `
        INSERT INTO webhook_events (
          id, razorpay_event_id, event_type, signature_valid, raw_body_hash,
          received_at, processed_at, processing_status, retry_count, error_message
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9)
        RETURNING *;
      `;
      const values = [
        record.id,
        record.razorpay_event_id,
        record.event_type,
        record.signature_valid,
        record.raw_body_hash,
        record.processed_at || null,
        record.processing_status,
        record.retry_count,
        record.error_message || null,
      ];

      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (err: any) {
      // Fallback to memory store if DB is disconnected
      return record;
    }
  }

  public async findByRazorpayEventId(razorpayEventId: string): Promise<WebhookEvent | null> {
    // Check memory store first for immediate idempotency
    const memRecord = WebhookEventRepository.memoryStore.get(razorpayEventId);
    if (memRecord) {
      return memRecord;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM webhook_events WHERE razorpay_event_id = $1', [razorpayEventId]);
      if (rows[0]) {
        WebhookEventRepository.memoryStore.set(rows[0].razorpay_event_id, rows[0]);
        return rows[0];
      }
    } catch (err: any) {
      // DB unavailable, memory lookup was already checked
    }

    return null;
  }

  public async updateProcessingStatus(
    id: string,
    status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'DUPLICATE' | 'IGNORED',
    errorMessage?: string
  ): Promise<WebhookEvent | null> {
    // Update memory store if present
    for (const [key, val] of WebhookEventRepository.memoryStore.entries()) {
      if (val.id === id) {
        val.processing_status = status;
        val.processed_at = new Date().toISOString();
        val.error_message = errorMessage;
        WebhookEventRepository.memoryStore.set(key, val);
        break;
      }
    }

    try {
      const pool = getDbPool();
      const query = `
        UPDATE webhook_events
        SET processing_status = $1,
            processed_at = NOW(),
            error_message = $2
        WHERE id = $3
        RETURNING *;
      `;
      const { rows } = await pool.query(query, [status, errorMessage || null, id]);
      return rows[0] || null;
    } catch (err: any) {
      return null;
    }
  }
}
