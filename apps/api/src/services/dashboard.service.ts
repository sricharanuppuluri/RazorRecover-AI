import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';

export class DashboardService {
  private caseRepo = new RecoveryCaseRepository();

  public async getSummary() {
    const { cases } = await this.caseRepo.findAll({ limit: 1000 });

    let revenueAtRisk = 0;
    let potentiallyRecoverable = 0;
    let recoveredRevenue = 0;

    let activeCases = 0;
    let recoveredCases = 0;
    let stoppedCases = 0;
    let humanReviewCases = 0;
    let attemptedInterventions = 0;
    let successfulInterventions = 0;

    const outcomeDistribution = {
      RECOVERED: 0,
      WAITING: 0,
      HUMAN_REVIEW: 0,
      STOPPED: 0,
      FAILED: 0
    };

    for (const c of cases) {
      revenueAtRisk += c.amount_at_risk || 0;
      potentiallyRecoverable += c.expected_recovery_value || Math.floor((c.amount_at_risk || 0) * (c.recoverability_score || 0.6));

      if (c.status === 'RECOVERED') {
        recoveredRevenue += c.recovered_amount || c.amount_at_risk || 0;
        recoveredCases++;
        successfulInterventions++;
        attemptedInterventions++;
        outcomeDistribution.RECOVERED++;
      } else if (c.status === 'HUMAN_REVIEW') {
        humanReviewCases++;
        activeCases++;
        outcomeDistribution.HUMAN_REVIEW++;
      } else if (c.status === 'STOPPED') {
        stoppedCases++;
        outcomeDistribution.STOPPED++;
      } else if (c.status === 'FAILED') {
        attemptedInterventions++;
        outcomeDistribution.FAILED++;
      } else if (c.status === 'WAITING_FOR_OUTCOME' || c.status === 'ACTION_SENT' || c.status === 'ACTION_PENDING') {
        activeCases++;
        attemptedInterventions++;
        outcomeDistribution.WAITING++;
      } else {
        activeCases++;
        outcomeDistribution.WAITING++;
      }
    }

    const recoveryRate = potentiallyRecoverable > 0
      ? parseFloat(((recoveredRevenue / potentiallyRecoverable) * 100).toFixed(2))
      : 0;

    const recoveryYield = revenueAtRisk > 0
      ? parseFloat(((recoveredRevenue / revenueAtRisk) * 100).toFixed(2))
      : 0;

    const interventionSuccessRate = attemptedInterventions > 0
      ? parseFloat(((successfulInterventions / attemptedInterventions) * 100).toFixed(2))
      : 0;

    // Funnel counts
    const totalFailedPayments = cases.length;
    const atRiskCount = cases.filter(c => c.amount_at_risk > 0).length;
    const aiRecommendedCount = cases.filter(c => c.recommended_action && c.recommended_action !== 'STOP').length;
    const policyApprovedCount = cases.filter(c => c.policy_decision === 'APPROVED').length;
    const actionExecutedCount = cases.filter(c => ['ACTION_SENT', 'WAITING_FOR_OUTCOME', 'RECOVERED', 'FAILED'].includes(c.status)).length;
    const recoveredCount = recoveredCases;

    const funnel = [
      { step: 'Failed Payments', count: totalFailedPayments },
      { step: 'At Risk', count: atRiskCount },
      { step: 'AI Recommended', count: aiRecommendedCount },
      { step: 'Policy Approved', count: policyApprovedCount },
      { step: 'Action Executed', count: actionExecutedCount },
      { step: 'Recovered', count: recoveredCount }
    ];

    // Build 7-day daily recovery trend
    const dailyTrend: { date: string; revenueAtRisk: number; recoveredRevenue: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      
      // Calculate daily aggregates
      let dayAtRisk = 0;
      let dayRecovered = 0;
      for (const c of cases) {
        const caseDate = c.started_at.split('T')[0];
        if (caseDate === dateStr) {
          dayAtRisk += c.amount_at_risk || 0;
          if (c.status === 'RECOVERED') {
            dayRecovered += c.recovered_amount || c.amount_at_risk || 0;
          }
        }
      }
      
      // If mock day has no data, synthesize proportional points for display
      if (dayAtRisk === 0) {
        const factor = (7 - (i % 3)) / 10;
        dayAtRisk = Math.floor((revenueAtRisk / 7) * factor);
        dayRecovered = Math.floor((recoveredRevenue / 7) * factor);
      }

      dailyTrend.push({
        date: dateStr,
        revenueAtRisk: dayAtRisk,
        recoveredRevenue: dayRecovered
      });
    }

    return {
      kpis: {
        revenueAtRisk,
        potentiallyRecoverable,
        recoveredRevenue,
        recoveryRate,
        recoveryYield
      },
      counts: {
        totalCases: cases.length,
        activeCases,
        recoveredCases,
        stoppedCases,
        humanReviewCases,
        interventionSuccessRate,
        safetyViolations: 0
      },
      funnel,
      outcomeDistribution,
      dailyTrend,
      environment: 'TEST MODE',
      merchantName: 'RazorRecover AI Demo Merchant'
    };
  }
}
