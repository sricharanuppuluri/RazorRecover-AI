import { PaymentRepository } from '../repositories/payment.repository';
import { DegradationAlert, AllowedAction, Payment } from '@razorrecover/shared-types';

export class DegradationService {
  private paymentRepo = new PaymentRepository();

  public async detectDegradationAlerts(
    merchantId: string,
    windowMinutes = 30,
    failureThresholdRate = 0.35,
    minAttemptsThreshold = 3
  ): Promise<DegradationAlert[]> {
    const allPayments: Payment[] = await this.paymentRepo.findByMerchantId(merchantId);

    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    // Filter payments in window
    const recentPayments = allPayments.filter((p: Payment) => {
      const pTime = new Date(p.created_at).getTime();
      return now - pTime <= windowMs;
    });

    // Group by bank / method
    const clusters: Map<string, { total: number; failed: number; method?: string; bank?: string }> = new Map();

    for (const p of recentPayments) {
      const key = `${p.method || 'unknown'}:${p.bank || 'unknown'}`;
      if (!clusters.has(key)) {
        clusters.set(key, { total: 0, failed: 0, method: p.method, bank: p.bank });
      }
      const entry = clusters.get(key)!;
      entry.total += 1;
      if (p.status === 'FAILED') {
        entry.failed += 1;
      }
    }

    const alerts: DegradationAlert[] = [];

    for (const [, stat] of clusters.entries()) {
      if (stat.total >= minAttemptsThreshold) {
        const failureRate = stat.failed / stat.total;
        if (failureRate >= failureThresholdRate) {
          const suggestedAction: AllowedAction =
            stat.method === 'upi' || (stat.bank && stat.bank !== 'unknown')
              ? 'OFFER_ALTERNATE_PAYMENT'
              : 'WAIT_AND_RETRY';

          alerts.push({
            id: `deg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            merchantId,
            method: stat.method,
            bank: stat.bank,
            failureCount: stat.failed,
            failureRate: Number(failureRate.toFixed(4)),
            totalAttempts: stat.total,
            windowMinutes,
            detectedAt: new Date().toISOString(),
            suggestedAction,
          });
        }
      }
    }

    return alerts;
  }
}
