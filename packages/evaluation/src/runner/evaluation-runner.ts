import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EVALUATION_CONFIG } from '../config/evaluation-version';
import { generateSyntheticDataset } from '../generator/synthetic-generator';
import { splitDataset, DatasetSplit } from '../split/dataset-split';
import { NoRecoveryBaseline } from '../baselines/no-recovery';
import { AlwaysRetryBaseline } from '../baselines/always-retry';
import { RuleBasedBaseline } from '../baselines/rule-based';
import { AIAgentBaseline } from '../baselines/ai-agent';
import { Baseline } from '../baselines/baseline.interface';
import { simulateOutcome } from './simulation-outcome';
import { calculateBusinessMetrics, BusinessMetrics } from '../metrics/business-metrics';
import { calculateDecisionMetrics, DecisionMetrics } from '../metrics/decision-metrics';
import { calculateCalibrationMetrics, CalibrationBucket } from '../metrics/calibration';
import { calculateSafetyMetrics, SafetyMetrics } from '../metrics/safety-metrics';
import { SyntheticRecord } from '../generator/synthetic-record.interface';

export interface BaselineEvaluationSummary {
  baselineName: string;
  splitName: 'DEVELOPMENT' | 'VALIDATION' | 'HELD_OUT_TEST';
  businessMetrics: BusinessMetrics;
  decisionMetrics: DecisionMetrics;
  calibrationMetrics: CalibrationBucket[];
  safetyMetrics: SafetyMetrics;
}

export interface EvaluationRunResult {
  manifest: any;
  splitCounts: { dev: number; val: number; test: number };
  baselines: Record<string, { dev: BaselineEvaluationSummary; val: BaselineEvaluationSummary; test: BaselineEvaluationSummary }>;
  heldoutComparisonTable: string;
  reportMarkdown: string;
}

export async function runFullEvaluation(
  datasetSize?: number,
  seed?: number,
  outputDir?: string
): Promise<EvaluationRunResult> {
  const count = datasetSize || EVALUATION_CONFIG.defaultDatasetSize;
  const currentSeed = seed !== undefined ? seed : EVALUATION_CONFIG.defaultSeed;
  const baseDir = outputDir || path.resolve(process.cwd());

  const syntheticDir = path.join(baseDir, 'data', 'synthetic');
  const evaluationDir = path.join(baseDir, 'data', 'evaluation');

  if (!fs.existsSync(syntheticDir)) {
    fs.mkdirSync(syntheticDir, { recursive: true });
  }
  if (!fs.existsSync(evaluationDir)) {
    fs.mkdirSync(evaluationDir, { recursive: true });
  }

  // 1. Generate Dataset
  const records = generateSyntheticDataset({ count, seed: currentSeed });
  const splits = splitDataset(records);

  // 2. Write dataset-v1.jsonl & compute SHA-256
  const jsonlPath = path.join(syntheticDir, 'dataset-v1.jsonl');
  const jsonlLines = records.map(r => JSON.stringify(r));
  const jsonlContent = jsonlLines.join('\n');
  fs.writeFileSync(jsonlPath, jsonlContent, 'utf-8');

  const sha256Checksum = crypto.createHash('sha256').update(jsonlContent).digest('hex');

  // 3. Write dataset-v1-manifest.json
  const manifest = {
    dataset_version: EVALUATION_CONFIG.datasetVersion,
    generator_version: EVALUATION_CONFIG.generatorVersion,
    seed: currentSeed,
    record_count: count,
    development_count: splits.dev.length,
    validation_count: splits.val.length,
    heldout_count: splits.test.length,
    generated_at: new Date().toISOString(),
    schema_version: EVALUATION_CONFIG.schemaVersion,
    policy_version: EVALUATION_CONFIG.policyVersion,
    prompt_version: EVALUATION_CONFIG.promptVersion,
    sha256_checksum: sha256Checksum
  };
  fs.writeFileSync(path.join(syntheticDir, 'dataset-v1-manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  // 4. Initialize Baselines
  const baselines: Baseline[] = [
    new NoRecoveryBaseline(),
    new AlwaysRetryBaseline(),
    new RuleBasedBaseline(),
    new AIAgentBaseline()
  ];

  const results: Record<string, { dev: BaselineEvaluationSummary; val: BaselineEvaluationSummary; test: BaselineEvaluationSummary }> = {};

  // Store No Recovery & Rule-Based recovered amounts for incremental revenue calculations
  const baselineTotals: Record<string, Record<string, number>> = {
    dev: {},
    val: {},
    test: {}
  };

  // Helper to evaluate a baseline on a split
  async function evaluateSplit(baseline: Baseline, splitRecords: SyntheticRecord[], splitName: 'DEVELOPMENT' | 'VALIDATION' | 'HELD_OUT_TEST', splitKey: 'dev' | 'val' | 'test') {
    const itemResults = [];
    for (const record of splitRecords) {
      const decision = await baseline.evaluateRecord(record);
      const outcome = simulateOutcome(record, decision);
      itemResults.push(outcome);
    }

    const noRecVal = baselineTotals[splitKey]['No Recovery'] || 0;
    const ruleVal = baselineTotals[splitKey]['Rule-Based'] || 0;

    const bMetrics = calculateBusinessMetrics(itemResults, noRecVal, ruleVal);
    const dMetrics = calculateDecisionMetrics(itemResults);
    const cMetrics = calculateCalibrationMetrics(itemResults);
    const sMetrics = calculateSafetyMetrics(itemResults);

    if (baseline.name === 'No Recovery') {
      baselineTotals[splitKey]['No Recovery'] = bMetrics.actual_recovered_revenue;
    }
    if (baseline.name === 'Rule-Based') {
      baselineTotals[splitKey]['Rule-Based'] = bMetrics.actual_recovered_revenue;
    }

    return {
      baselineName: baseline.name,
      splitName,
      businessMetrics: bMetrics,
      decisionMetrics: dMetrics,
      calibrationMetrics: cMetrics,
      safetyMetrics: sMetrics
    };
  }

  for (const baseline of baselines) {
    const devEval = await evaluateSplit(baseline, splits.dev, 'DEVELOPMENT', 'dev');
    const valEval = await evaluateSplit(baseline, splits.val, 'VALIDATION', 'val');
    const testEval = await evaluateSplit(baseline, splits.test, 'HELD_OUT_TEST', 'test');

    results[baseline.name] = {
      dev: devEval,
      val: valEval,
      test: testEval
    };
  }

  // 5. Build Markdown Report & JSON Outputs
  const reportMarkdown = generateReportMarkdown(manifest, results);
  fs.writeFileSync(path.join(evaluationDir, 'report-v1.md'), reportMarkdown, 'utf-8');

  const heldoutResults = {
    manifest,
    held_out_evaluation: Object.values(results).map(b => b.test)
  };
  fs.writeFileSync(path.join(evaluationDir, 'heldout-results-v1.json'), JSON.stringify(heldoutResults, null, 2), 'utf-8');

  const summary = {
    manifest,
    summary: Object.entries(results).map(([name, b]) => ({
      baseline: name,
      dev_recovered_inr: (b.dev.businessMetrics.actual_recovered_revenue / 100).toFixed(2),
      val_recovered_inr: (b.val.businessMetrics.actual_recovered_revenue / 100).toFixed(2),
      heldout_recovered_inr: (b.test.businessMetrics.actual_recovered_revenue / 100).toFixed(2),
      heldout_recovery_rate: `${(b.test.businessMetrics.recovery_rate * 100).toFixed(2)}%`,
      heldout_safety_violations: b.test.safetyMetrics.total_safety_violations
    }))
  };
  fs.writeFileSync(path.join(evaluationDir, 'summary-v1.json'), JSON.stringify(summary, null, 2), 'utf-8');

  return {
    manifest,
    splitCounts: { dev: splits.dev.length, val: splits.val.length, test: splits.test.length },
    baselines: results,
    heldoutComparisonTable: generateComparisonTable(results, 'test'),
    reportMarkdown
  };
}

function generateComparisonTable(results: Record<string, any>, splitKey: 'dev' | 'val' | 'test'): string {
  let table = `| Baseline | Revenue at Risk (INR) | Potentially Recoverable (INR) | Recovered Revenue (INR) | Net Recovered (INR) | Recovery Rate | Recovery Yield | Action Accuracy | Safety Violations |\n`;
  table += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  for (const [name, b] of Object.entries(results)) {
    const bm = b[splitKey].businessMetrics;
    const dm = b[splitKey].decisionMetrics;
    const sm = b[splitKey].safetyMetrics;

    table += `| **${name}** | ₹${(bm.total_revenue_at_risk / 100).toLocaleString('en-IN')} | ₹${(bm.potentially_recoverable_revenue / 100).toLocaleString('en-IN')} | ₹${(bm.actual_recovered_revenue / 100).toLocaleString('en-IN')} | ₹${(bm.net_revenue_recovered / 100).toLocaleString('en-IN')} | ${(bm.recovery_rate * 100).toFixed(2)}% | ${(bm.recovery_yield * 100).toFixed(2)}% | ${(dm.action_selection_accuracy * 100).toFixed(2)}% | ${sm.total_safety_violations} |\n`;
  }

  return table;
}

function generateReportMarkdown(manifest: any, results: Record<string, any>): string {
  let md = `# RazorRecover AI — Phase 7 Held-Out Evaluation Report\n\n`;
  md += `**Dataset Version:** ${manifest.dataset_version} | **Generator Version:** ${manifest.generator_version} | **Seed:** ${manifest.seed}\n`;
  md += `**Total Synthetic Records:** ${manifest.record_count.toLocaleString()} (Dev: ${manifest.development_count.toLocaleString()} | Val: ${manifest.validation_count.toLocaleString()} | Held-Out Test: ${manifest.heldout_count.toLocaleString()})\n`;
  md += `**SHA-256 Checksum:** \`${manifest.sha256_checksum}\`\n\n`;

  md += `## 1. Held-Out Test Results (Primary Credibility Metric)\n\n`;
  md += generateComparisonTable(results, 'test');
  md += `\n`;

  md += `## 2. Baseline Incremental Performance (Held-Out Set)\n\n`;
  const aiTest = results['AI Agent'].test.businessMetrics;
  const noRecTest = results['No Recovery'].test.businessMetrics;
  const ruleTest = results['Rule-Based'].test.businessMetrics;

  md += `- **Incremental Revenue vs No Recovery:** +₹${((aiTest.actual_recovered_revenue - noRecTest.actual_recovered_revenue) / 100).toLocaleString('en-IN')}\n`;
  md += `- **Incremental Revenue vs Rule-Based:** +₹${((aiTest.actual_recovered_revenue - ruleTest.actual_recovered_revenue) / 100).toLocaleString('en-IN')}\n`;
  md += `- **Intervention Success Rate (AI Agent):** ${(aiTest.intervention_success_rate * 100).toFixed(2)}%\n`;
  md += `- **Precision / Recall / F1 (AI Agent):** Precision ${(results['AI Agent'].test.decisionMetrics.precision * 100).toFixed(2)}% | Recall ${(results['AI Agent'].test.decisionMetrics.recall * 100).toFixed(2)}% | F1 ${results['AI Agent'].test.decisionMetrics.f1_score}\n\n`;

  md += `## 3. Safety & Policy Compliance\n\n`;
  const aiSafety = results['AI Agent'].test.safetyMetrics;
  md += `- **Unauthorized Actions:** ${aiSafety.unauthorized_actions}\n`;
  md += `- **Policy Limit Violations:** ${aiSafety.policy_limit_violations}\n`;
  md += `- **Duplicate Notifications:** ${aiSafety.duplicate_notifications}\n`;
  md += `- **Actions After Successful Payment:** ${aiSafety.actions_after_successful_payment}\n`;
  md += `- **Total Safety Violations:** ${aiSafety.total_safety_violations}\n\n`;

  md += `## 4. Calibration Analysis (AI Agent - Held-Out Set)\n\n`;
  md += `| Probability Bucket | Record Count | Avg Predicted Probability | Actual Recovery Rate |\n`;
  md += `| :--- | :---: | :---: | :---: |\n`;
  for (const bucket of results['AI Agent'].test.calibrationMetrics) {
    md += `| ${bucket.range} | ${bucket.prediction_count} | ${(bucket.average_predicted_probability * 100).toFixed(1)}% | ${(bucket.actual_recovery_rate * 100).toFixed(1)}% |\n`;
  }
  md += `\n`;

  md += `*Note: All monetary metrics are generated from integer smallest currency units (paise) using synthetic scenarios. Held-out test records were evaluated after decision rules and policy thresholds were fixed.*`;

  return md;
}
