export const EVALUATION_CONFIG = {
  datasetVersion: 'v1.0.0',
  generatorVersion: 'v1.0.0',
  policyVersion: 'policy-v1',
  promptVersion: 'prompt-v1',
  schemaVersion: 'schema-v1',
  evaluationVersion: 'eval-v1.0.0',
  defaultSeed: 42,
  defaultDatasetSize: parseInt(process.env.EVALUATION_DATASET_SIZE || '10000', 10)
};
