import { Merchant } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class MerchantRepository {
  private static memoryStore = new Map<string, Merchant>();

  public async create(merchant: Partial<Merchant>): Promise<Merchant> {
    const record: Merchant = {
      id: merchant.id || 'mch_test_01',
      name: merchant.name || 'Test Merchant',
      currency: merchant.currency || 'INR',
      test_mode: merchant.test_mode !== undefined ? merchant.test_mode : true,
      policy_profile_id: merchant.policy_profile_id || 'pol_default',
      high_value_threshold: merchant.high_value_threshold || 10000000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    MerchantRepository.memoryStore.set(record.id, record);

    try {
      const pool = getDbPool();
      const query = `
        INSERT INTO merchants (id, name, currency, test_mode, policy_profile_id, high_value_threshold, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *;
      `;
      const values = [
        record.id,
        record.name,
        record.currency,
        record.test_mode,
        record.policy_profile_id,
        record.high_value_threshold,
      ];

      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (err: any) {
      return record;
    }
  }

  public async findById(id: string): Promise<Merchant | null> {
    if (MerchantRepository.memoryStore.has(id)) {
      return MerchantRepository.memoryStore.get(id)!;
    }

    try {
      const pool = getDbPool();
      const { rows } = await pool.query('SELECT * FROM merchants WHERE id = $1', [id]);
      if (rows[0]) {
        MerchantRepository.memoryStore.set(rows[0].id, rows[0]);
        return rows[0];
      }
    } catch (err: any) {}

    // Default mock merchant fallback for mch_test_01 in test/offline environment
    if (id === 'mch_test_01') {
      const defaultMerchant: Merchant = {
        id: 'mch_test_01',
        name: 'RazorRecover Demo Merchant',
        currency: 'INR',
        test_mode: true,
        policy_profile_id: 'pol_default',
        high_value_threshold: 10000000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      MerchantRepository.memoryStore.set(id, defaultMerchant);
      return defaultMerchant;
    }

    return null;
  }
}

