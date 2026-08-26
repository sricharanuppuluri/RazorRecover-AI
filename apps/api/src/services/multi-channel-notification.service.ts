import { NotificationDispatch, NotificationChannel } from '@razorrecover/shared-types';
import { NotificationRepository } from '../repositories/notification.repository';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { AuditEventRepository } from '../repositories/audit-event.repository';

export class MultiChannelNotificationService {
  private notificationRepo = new NotificationRepository();
  private caseRepo = new RecoveryCaseRepository();
  private customerRepo = new CustomerRepository();
  private auditRepo = new AuditEventRepository();

  public async dispatchNotification(
    merchantId: string,
    params: {
      recoveryCaseId: string;
      channel: NotificationChannel;
      templateName: string;
      language?: 'ENGLISH' | 'HINDI' | 'HINGLISH';
      customRecipient?: string;
    }
  ): Promise<NotificationDispatch> {
    const caseRecord = await this.caseRepo.findById(params.recoveryCaseId);
    if (!caseRecord || caseRecord.merchant_id !== merchantId) {
      throw new Error('Recovery case not found or unauthorized');
    }

    if (caseRecord.status === 'RECOVERED' || caseRecord.status === 'STOPPED') {
      throw new Error(`Cannot send recovery notification for case in state ${caseRecord.status}`);
    }

    // Customer check & opt-in validation
    const customer = await this.customerRepo.findById(caseRecord.order_id);
    if (customer && !customer.contact_opt_in) {
      throw new Error('Customer contact opt-in is false; notification blocked by policy');
    }

    const customerId = customer?.id || 'cust_unknown';

    // Frequency cap check: max 3 notifications per 24 hours per customer
    const recentCount = await this.notificationRepo.countRecentForCustomer(merchantId, customerId, 24);
    if (recentCount >= 3) {
      throw new Error('Customer 24-hour notification frequency limit exceeded');
    }

    const recipient = params.customRecipient || (params.channel === 'EMAIL' ? 'customer@example.com' : '+919876543210');
    const language = params.language || 'HINGLISH';

    const dispatchId = `nd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const dispatch: NotificationDispatch = {
      id: dispatchId,
      merchantId,
      recoveryCaseId: params.recoveryCaseId,
      customerId,
      channel: params.channel,
      recipient,
      templateName: params.templateName,
      language,
      status: 'DELIVERED',
      sentAt: now,
      deliveredAt: now,
      metadata: {
        amountAtRisk: caseRecord.amount_at_risk,
        caseType: caseRecord.case_type,
      },
    };

    await this.notificationRepo.create(dispatch);
    await this.caseRepo.incrementNotificationCount(caseRecord.id);

    await this.auditRepo.create({
      merchant_id: merchantId,
      recovery_case_id: caseRecord.id,
      event_type: 'MULTI_CHANNEL_NOTIFICATION_DISPATCHED',
      actor_type: 'system',
      actor_id: 'multi_channel_gateway',
      action: `SEND_${params.channel}`,
      decision_summary: `Dispatched ${params.channel} (${language}) notification using template '${params.templateName}' to ${recipient}`,
      outcome: 'APPROVED',
    });

    return dispatch;
  }

  public async getHistory(merchantId: string): Promise<NotificationDispatch[]> {
    return this.notificationRepo.findByMerchant(merchantId);
  }

  public async getSupportedChannels(): Promise<Array<{ channel: NotificationChannel; status: string; latencyMs: number }>> {
    return [
      { channel: 'WHATSAPP', status: 'ACTIVE', latencyMs: 120 },
      { channel: 'SMS', status: 'ACTIVE', latencyMs: 80 },
      { channel: 'EMAIL', status: 'ACTIVE', latencyMs: 250 },
      { channel: 'WEBHOOK', status: 'ACTIVE', latencyMs: 45 },
    ];
  }
}
