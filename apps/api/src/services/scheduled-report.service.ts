import { ScheduledReport } from '@razorrecover/shared-types';
import { ScheduledReportRepository } from '../repositories/scheduled-report.repository';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { AuditEventRepository } from '../repositories/audit-event.repository';

export class ScheduledReportService {
  private reportRepo = new ScheduledReportRepository();
  private caseRepo = new RecoveryCaseRepository();
  private auditRepo = new AuditEventRepository();

  public async createSubscription(
    merchantId: string,
    params: {
      title: string;
      cadence: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      recipients: string[];
      format?: 'JSON' | 'CSV' | 'PDF';
    }
  ): Promise<ScheduledReport> {
    if (!params.title || !params.recipients || params.recipients.length === 0) {
      throw new Error('Title and at least one recipient are required');
    }

    const reportId = `sr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const nextDate = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    const report: ScheduledReport = {
      id: reportId,
      merchantId,
      title: params.title,
      cadence: params.cadence,
      recipients: params.recipients,
      format: params.format || 'PDF',
      status: 'ACTIVE',
      nextScheduledAt: nextDate,
      createdAt: now.toISOString(),
    };

    await this.reportRepo.create(report);

    await this.auditRepo.create({
      merchant_id: merchantId,
      event_type: 'SCHEDULED_REPORT_CREATED',
      actor_type: 'merchant',
      actor_id: 'merchant_admin',
      action: 'CREATE_REPORT_SUBSCRIPTION',
      decision_summary: `Created ${params.cadence} scheduled operational report '${params.title}' for ${params.recipients.join(', ')}`,
      outcome: 'APPROVED',
    });

    return report;
  }

  public async listSubscriptions(merchantId: string): Promise<ScheduledReport[]> {
    return this.reportRepo.findByMerchant(merchantId);
  }

  public async generateReportPayload(
    merchantId: string,
    reportId: string
  ): Promise<{
    report: ScheduledReport;
    generatedAt: string;
    metrics: {
      totalCasesProcessed: number;
      totalRecoveredAmount: number;
      recoveryYield: string;
    };
    summaryPayload: string;
  }> {
    const report = await this.reportRepo.findById(reportId);
    if (!report || report.merchantId !== merchantId) {
      throw new Error('Scheduled report subscription not found or unauthorized');
    }

    const cases = await this.caseRepo.findAllByMerchant(merchantId);
    const recoveredCases = cases.filter((c) => c.status === 'RECOVERED');
    const totalRecoveredAmount = recoveredCases.reduce((sum, c) => sum + (c.recovered_amount || 0), 0);
    const totalAtRisk = cases.reduce((sum, c) => sum + (c.amount_at_risk || 0), 0) || 1;
    const yieldPercentage = `${((totalRecoveredAmount / totalAtRisk) * 100).toFixed(2)}%`;

    const now = new Date().toISOString();
    report.lastGeneratedAt = now;
    await this.reportRepo.update(report);

    const summaryPayload = `RAZORRECOVER AI - OPERATIONAL RECOVERY REPORT
Merchant ID: ${merchantId}
Report Title: ${report.title}
Cadence: ${report.cadence}
Generated At: ${now}
----------------------------------------
Total Cases Processed: ${cases.length}
Total Recovered Revenue: ₹${(totalRecoveredAmount / 100).toLocaleString('en-IN')}
Recovery Yield: ${yieldPercentage}
Status: COMPLETE`;

    return {
      report,
      generatedAt: now,
      metrics: {
        totalCasesProcessed: cases.length,
        totalRecoveredAmount,
        recoveryYield: yieldPercentage,
      },
      summaryPayload,
    };
  }
}
