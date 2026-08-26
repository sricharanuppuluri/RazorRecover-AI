import { NotificationDispatch } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class NotificationRepository {
  private static memoryStore = new Map<string, NotificationDispatch>();

  public async create(dispatch: NotificationDispatch): Promise<NotificationDispatch> {
    NotificationRepository.memoryStore.set(dispatch.id, { ...dispatch });

    try {
      const pool = getDbPool();
      const query = `
        INSERT INTO notifications (
          id, merchant_id, recovery_case_id, customer_id, channel, recipient,
          template_name, language, status, sent_at, delivered_at, error_message, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *;
      `;
      const values = [
        dispatch.id,
        dispatch.merchantId,
        dispatch.recoveryCaseId,
        dispatch.customerId,
        dispatch.channel,
        dispatch.recipient,
        dispatch.templateName,
        dispatch.language,
        dispatch.status,
        dispatch.sentAt || null,
        dispatch.deliveredAt || null,
        dispatch.errorMessage || null,
        dispatch.metadata ? JSON.stringify(dispatch.metadata) : null,
      ];
      await pool.query(query, values);
    } catch (err: any) {}

    return dispatch;
  }

  public async findById(id: string): Promise<NotificationDispatch | null> {
    return NotificationRepository.memoryStore.get(id) || null;
  }

  public async findByMerchant(merchantId: string): Promise<NotificationDispatch[]> {
    return Array.from(NotificationRepository.memoryStore.values()).filter((n) => n.merchantId === merchantId);
  }

  public async findByCustomer(merchantId: string, customerId: string): Promise<NotificationDispatch[]> {
    return Array.from(NotificationRepository.memoryStore.values()).filter(
      (n) => n.merchantId === merchantId && n.customerId === customerId
    );
  }

  public async countRecentForCustomer(merchantId: string, customerId: string, windowHours: number = 24): Promise<number> {
    const cutoff = Date.now() - windowHours * 3600 * 1000;
    return Array.from(NotificationRepository.memoryStore.values()).filter(
      (n) =>
        n.merchantId === merchantId &&
        n.customerId === customerId &&
        n.sentAt &&
        new Date(n.sentAt).getTime() >= cutoff
    ).length;
  }

  public async clear(): Promise<void> {
    NotificationRepository.memoryStore.clear();
  }
}
