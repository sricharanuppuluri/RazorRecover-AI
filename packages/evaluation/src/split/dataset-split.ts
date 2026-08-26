import { SyntheticRecord } from '../generator/synthetic-record.interface';

export interface DatasetSplit {
  dev: SyntheticRecord[];
  val: SyntheticRecord[];
  test: SyntheticRecord[];
}

export function splitDataset(records: SyntheticRecord[]): DatasetSplit {
  const total = records.length;
  const devCount = Math.floor(total * 0.70);
  const valCount = Math.floor(total * 0.15);

  const dev = records.slice(0, devCount);
  const val = records.slice(devCount, devCount + valCount);
  const test = records.slice(devCount + valCount);

  // Safety verification: No ID overlap
  const devIds = new Set(dev.map(r => r.transaction_id));
  const valIds = new Set(val.map(r => r.transaction_id));
  const testIds = new Set(test.map(r => r.transaction_id));

  for (const id of valIds) {
    if (devIds.has(id)) {
      throw new Error(`Data leakage detected: ID ${id} present in both dev and val splits`);
    }
  }

  for (const id of testIds) {
    if (devIds.has(id) || valIds.has(id)) {
      throw new Error(`Data leakage detected: ID ${id} present in test split and dev/val splits`);
    }
  }

  return { dev, val, test };
}
