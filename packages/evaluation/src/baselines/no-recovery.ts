import { Baseline, BaselineDecision } from './baseline.interface';
import { SyntheticRecord } from '../generator/synthetic-record.interface';

export class NoRecoveryBaseline implements Baseline {
  public name = 'No Recovery';

  public async evaluateRecord(_record: SyntheticRecord): Promise<BaselineDecision> {
    return {
      action: 'STOP',
      allowedByPolicy: true,
      predictedProbability: 0,
      predictedCategory: 'NO_ACTION'
    };
  }
}
