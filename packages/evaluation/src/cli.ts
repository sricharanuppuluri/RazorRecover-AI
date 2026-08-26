import { runFullEvaluation } from './runner/evaluation-runner';

async function main() {
  console.log('🚀 Running RazorRecover AI Phase 7 Evaluation Pipeline...');
  const size = parseInt(process.env.EVALUATION_DATASET_SIZE || '10000', 10);
  const seed = parseInt(process.env.EVALUATION_SEED || '42', 10);

  const start = Date.now();
  const result = await runFullEvaluation(size, seed);
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  console.log(`\n✅ Evaluation Complete in ${elapsed}s!`);
  console.log(`- Dataset Version: ${result.manifest.dataset_version}`);
  console.log(`- Total Records: ${result.manifest.record_count} (Dev: ${result.splitCounts.dev}, Val: ${result.splitCounts.val}, Test: ${result.splitCounts.test})`);
  console.log(`- Dataset SHA-256: ${result.manifest.sha256_checksum}\n`);

  console.log('📊 Held-Out Test Baseline Comparison:');
  console.log(result.heldoutComparisonTable);
  console.log('\n📁 Output files written to:');
  console.log('  - data/synthetic/dataset-v1.jsonl');
  console.log('  - data/synthetic/dataset-v1-manifest.json');
  console.log('  - data/evaluation/heldout-results-v1.json');
  console.log('  - data/evaluation/summary-v1.json');
  console.log('  - data/evaluation/report-v1.md');
}

main().catch(err => {
  console.error('❌ Evaluation failed:', err);
  process.exit(1);
});
