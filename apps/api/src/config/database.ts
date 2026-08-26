import { Pool } from 'pg';
import { env } from './env';

let dbPool: Pool | null = null;

export function getDbPool(): Pool {
  if (!dbPool) {
    dbPool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    dbPool.on('error', (err) => {
      console.warn('[Database Pool Warning] Idle client error:', err.message);
    });
  }
  return dbPool;
}

export async function checkDatabaseHealth(): Promise<'connected' | 'disconnected' | 'unconfigured'> {
  if (!env.DATABASE_URL) {
    return 'unconfigured';
  }
  try {
    const pool = getDbPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return 'connected';
  } catch (error) {
    return 'disconnected';
  }
}
