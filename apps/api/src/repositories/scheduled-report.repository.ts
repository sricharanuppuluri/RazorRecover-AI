import { ScheduledReport } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class ScheduledReportRepository {
  private static memoryStore = new Map<string, ScheduledReport>();
  private static seeded = false;

  private static seedDemoData() {
    if (ScheduledReportRepository.seeded || ScheduledReportRepository.memoryStore.size > 0) return;
    ScheduledReportRepository.seeded = true;

    const demoReports: ScheduledReport[] = [
      {
        id: 'sr_demo_01',
        merchantId: 'mch_test_01',
        title: 'Daily Executive Recovery Summary',
        cadence: 'DAILY',
        recipients: ['finance@merchant.com', 'ops@merchant.com'],
        format: 'PDF',
        status: 'ACTIVE',
        lastGeneratedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        nextScheduledAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'sr_demo_02',
        merchantId: 'mch_test_01',
        title: 'Weekly Causal Impact & Uplift Audit',
        cadence: 'WEEKLY',
        recipients: ['cto@merchant.com'],
        format: 'CSV',
        status: 'ACTIVE',
        lastGeneratedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        nextScheduledAt: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
      },
    ];

    for (const r of demoReports) {
      ScheduledReportRepository.memoryStore.set(r.id, r);
    }
  }

  public async create(report: ScheduledReport): Promise<ScheduledReport> {
    ScheduledReportRepository.seedDemoData();
    ScheduledReportRepository.memoryStore.set(report.id, { ...report });

    try {
      const pool = getDbPool();
      const query = `
        INSERT INTO scheduled_reports (
          id, merchant_id, title, cadence, recipients, format, status, last_generated_at, next_scheduled_at, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
      `;
      const values = [
        report.id,
        report.merchantId,
        report.title,
        report.cadence,
        JSON.stringify(report.recipients),
        report.format,
        report.status,
        report.lastGeneratedAt || null,
        report.nextScheduledAt,
        report.createdAt,
      ];
      await pool.query(query, values);
    } catch (err: any) {}

    return report;
  }

  public async findById(id: string): Promise<ScheduledReport | null> {
    ScheduledReportRepository.seedDemoData();
    return ScheduledReportRepository.memoryStore.get(id) || null;
  }

  public async findByMerchant(merchantId: string): Promise<ScheduledReport[]> {
    ScheduledReportRepository.seedDemoData();
    return Array.from(ScheduledReportRepository.memoryStore.values()).filter((r) => r.merchantId === merchantId);
  }

  public async update(report: ScheduledReport): Promise<ScheduledReport> {
    ScheduledReportRepository.seedDemoData();
    ScheduledReportRepository.memoryStore.set(report.id, { ...report });
    return report;
  }

  public async clear(): Promise<void> {
    ScheduledReportRepository.memoryStore.clear();
    ScheduledReportRepository.seeded = true;
  }
}
