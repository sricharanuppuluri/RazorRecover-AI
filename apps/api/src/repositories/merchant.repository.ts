import { Merchant } from '@razorrecover/shared-types';
import { getDbPool } from '../config/database';

export class MerchantRepository {
  public async create(merchant: Partial<Merchant>): Promise<Merchant> {
    const pool = getDbPool();
    const query = `
      INSERT INTO merchants (id, name, currency, test_mode, policy_profile_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *;
    `;
    const values = [
      merchant.id,
      merchant.name,
      merchant.currency || 'INR',
      merchant.test_mode !== undefined ? merchant.test_mode : true,
      merchant.policy_profile_id || null,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  public async findById(id: string): Promise<Merchant | null> {
    const pool = getDbPool();
    const { rows } = await pool.query('SELECT * FROM merchants WHERE id = $1', [id]);
    return rows[0] || null;
  }
}
