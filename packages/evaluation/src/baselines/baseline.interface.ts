import { AllowedAction } from '@razorrecover/shared-types';
import { SyntheticRecord } from '../generator/synthetic-record.interface';

export interface BaselineDecision {
  action: AllowedAction;
  allowedByPolicy: boolean;
  policyReason?: string;
  predictedProbability?: number;
  predictedCategory?: string;
}

export interface Baseline {
  name: string;
  evaluateRecord(record: SyntheticRecord): Promise<BaselineDecision>;
}
