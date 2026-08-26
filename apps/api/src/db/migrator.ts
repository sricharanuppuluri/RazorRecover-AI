import fs from 'fs';
import path from 'path';
import { getDbPool } from '../config/database';

export async function ensureMigrationTable(): Promise<void> {
  const pool = getDbPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function runMigrations(): Promise<void> {
  console.log('[Migrator] Checking database connection and pending migrations...');
  const pool = getDbPool();
  await ensureMigrationTable();

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found at ${migrationsDir}`);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && !f.endsWith('_down.sql'))
    .sort();

  const { rows } = await pool.query('SELECT name FROM schema_migrations');
  const appliedMigrations = new Set(rows.map(r => r.name));

  for (const file of files) {
    if (!appliedMigrations.has(file)) {
      console.log(`[Migrator] Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[Migrator] Successfully applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migrator Error] Failed to apply ${file}:`, err);
        throw err;
      } finally {
        client.release();
      }
    } else {
      console.log(`[Migrator] Already applied: ${file}`);
    }
  }
  console.log('[Migrator] All migrations are up to date.');
}

export async function rollbackLatestMigration(): Promise<void> {
  console.log('[Migrator] Rolling back latest migration...');
  const pool = getDbPool();
  await ensureMigrationTable();

  const { rows } = await pool.query('SELECT name FROM schema_migrations ORDER BY id DESC LIMIT 1');
  if (rows.length === 0) {
    console.log('[Migrator] No migrations to roll back.');
    return;
  }

  const latestMigration = rows[0].name;
  const downFile = latestMigration.replace('.sql', '_down.sql');
  const downFilePath = path.join(__dirname, 'migrations', downFile);

  if (!fs.existsSync(downFilePath)) {
    throw new Error(`Rollback SQL file not found: ${downFilePath}`);
  }

  const sql = fs.readFileSync(downFilePath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('DELETE FROM schema_migrations WHERE name = $1', [latestMigration]);
    await client.query('COMMIT');
    console.log(`[Migrator] Successfully rolled back ${latestMigration}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[Migrator Error] Failed to rollback ${latestMigration}:`, err);
    throw err;
  } finally {
    client.release();
  }
}

// CLI Execution handler if run directly
if (require.main === module) {
  const action = process.argv[2];
  if (action === 'rollback') {
    rollbackLatestMigration()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  } else {
    runMigrations()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
}
