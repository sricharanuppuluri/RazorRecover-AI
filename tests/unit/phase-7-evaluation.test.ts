import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as fs from 'fs';
import { runFullEvaluation } from '../../packages/evaluation/src/runner/evaluation-runner';
import { generateSyntheticDataset } from '../../packages/evaluation/src/generator/synthetic-generator';
import { NoRecoveryBaseline } from '../../packages/evaluation/src/baselines/no-recovery';
import { AlwaysRetryBaseline } from '../../packages/evaluation/src/baselines/always-retry';
import { RuleBasedBaseline } from '../../packages/evaluation/src/baselines/rule-based';
import { AIAgentBaseline } from '../../packages/evaluation/src/baselines/ai-agent';
import { calculateBusinessMetrics } from '../../packages/evaluation/src/metrics/business-metrics';
import { calculateDecisionMetrics } from '../../packages/evaluation/src/metrics/decision-metrics';
import { calculateCalibrationMetrics } from '../../packages/evaluation/src/metrics/calibration';
import { calculateSafetyMetrics } from '../../packages/evaluation/src/metrics/safety-metrics';
import { simulateOutcome } from '../../packages/evaluation/src/runner/simulation-outcome';

test('Phase 7 Evaluation - Baselines Return Valid Decisions', async () => {
  const records = generateSyntheticDataset({ count: 10, seed: 42 });

  const noRec = new NoRecoveryBaseline();
  const alwaysRetry = new AlwaysRetryBaseline();
  const ruleBased = new RuleBasedBaseline();
  const aiAgent = new AIAgentBaseline();

  for (const record of records) {
    const d1 = await noRec.evaluateRecord(record);
    assert.equal(d1.action, 'STOP');

    const d2 = await alwaysRetry.evaluateRecord(record);
    assert.ok(['WAIT_AND_RETRY', 'STOP'].includes(d2.action));

    const d3 = await ruleBased.evaluateRecord(record);
    assert.ok(['WAIT_AND_RETRY', 'OFFER_ALTERNATE_PAYMENT', 'SEND_RECOVERY_LINK', 'SEND_REMINDER', 'ESCALATE_HUMAN', 'STOP'].includes(d3.action));

    const d4 = await aiAgent.evaluateRecord(record);
    assert.ok(['WAIT_AND_RETRY', 'OFFER_ALTERNATE_PAYMENT', 'SEND_RECOVERY_LINK', 'SEND_REMINDER', 'ESCALATE_HUMAN', 'STOP'].includes(d4.action));
  }
});

test('Phase 7 Evaluation - Business, Decision, Calibration & Safety Metrics Logic', () => {
  const records = generateSyntheticDataset({ count: 50, seed: 100 });
  const results = records.map(r => simulateOutcome(r, {
    action: r.ground_truth_best_action,
    allowedByPolicy: true,
    predictedProbability: r.ground_truth_recoverable ? 0.80 : 0.20
  }));

  const bMetrics = calculateBusinessMetrics(results, 0, 0);
  assert.equal(bMetrics.total_records, 50);
  assert.ok(bMetrics.total_revenue_at_risk > 0);
  assert.ok(bMetrics.recovery_rate >= 0 && bMetrics.recovery_rate <= 1);
  assert.ok(bMetrics.recovery_yield >= 0 && bMetrics.recovery_yield <= 1);

  const dMetrics = calculateDecisionMetrics(results);
  assert.equal(dMetrics.action_selection_accuracy, 1.0);
  assert.ok(dMetrics.precision >= 0 && dMetrics.precision <= 1);
  assert.ok(dMetrics.recall >= 0 && dMetrics.recall <= 1);
  assert.ok(dMetrics.f1_score >= 0 && dMetrics.f1_score <= 1);

  const cMetrics = calculateCalibrationMetrics(results);
  assert.equal(cMetrics.length, 10);

  const sMetrics = calculateSafetyMetrics(results);
  assert.equal(sMetrics.total_safety_violations, 0);
});

test('Phase 7 Evaluation Pipeline - Full End-to-End Execution & Artifacts', async () => {
  const testOutputDir = path.join(process.cwd(), 'data', 'test-tmp');
  const evalResult = await runFullEvaluation(500, 42, testOutputDir);

  assert.equal(evalResult.manifest.record_count, 500);
  assert.equal(evalResult.splitCounts.dev, 350);
  assert.equal(evalResult.splitCounts.val, 75);
  assert.equal(evalResult.splitCounts.test, 75);

  const testBaselines = evalResult.baselines;
  assert.ok(testBaselines['No Recovery']);
  assert.ok(testBaselines['Always Retry']);
  assert.ok(testBaselines['Rule-Based']);
  assert.ok(testBaselines['AI Agent']);

  // AI Agent should outperform No Recovery on held-out test set
  const aiTestRev = testBaselines['AI Agent'].test.businessMetrics.actual_recovered_revenue;
  const noRecTestRev = testBaselines['No Recovery'].test.businessMetrics.actual_recovered_revenue;
  assert.ok(aiTestRev > noRecTestRev, 'AI Agent must generate positive incremental revenue over No Recovery');

  // AI Agent should have 0 safety violations on test set
  assert.equal(testBaselines['AI Agent'].test.safetyMetrics.total_safety_violations, 0);

  // Clean up temporary test output dir
  if (fs.existsSync(testOutputDir)) {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  }
});
