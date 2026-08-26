import crypto from 'crypto';

export interface SendMessageParams {
  merchantId: string;
  customerId: string;
  recoveryCaseId: string;
  channel: 'email' | 'sms' | 'whatsapp';
  messageType: string;
  recoveryUrl?: string;
  correlationId: string;
}

export interface NotificationResult {
  success: boolean;
  notificationId: string;
  error?: string;
  recordedAt: string;
}

export interface NotificationProvider {
  sendRecoveryMessage(params: SendMessageParams): Promise<NotificationResult>;
}

export interface RecordedNotification extends SendMessageParams {
  notificationId: string;
  sentAt: string;
  recipientHash: string;
}

export class MockNotificationProvider implements NotificationProvider {
  private recordedNotifications: RecordedNotification[] = [];
  private shouldFail: boolean = false;

  public setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  public async sendRecoveryMessage(params: SendMessageParams): Promise<NotificationResult> {
    const recordedAt = new Date().toISOString();
    if (this.shouldFail) {
      return {
        success: false,
        notificationId: '',
        error: 'Mock notification provider configured to fail',
        recordedAt
      };
    }

    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const recipientHash = crypto.createHash('sha256').update(`${params.merchantId}_${params.customerId}`).digest('hex');

    const recorded: RecordedNotification = {
      ...params,
      notificationId,
      sentAt: recordedAt,
      recipientHash
    };

    this.recordedNotifications.push(recorded);

    return {
      success: true,
      notificationId,
      recordedAt
    };
  }

  public getRecordedNotifications(): RecordedNotification[] {
    return [...this.recordedNotifications];
  }

  public getNotificationsForCase(caseId: string): RecordedNotification[] {
    return this.recordedNotifications.filter(n => n.recoveryCaseId === caseId);
  }

  public clearRecords(): void {
    this.recordedNotifications = [];
    this.shouldFail = false;
  }
}
