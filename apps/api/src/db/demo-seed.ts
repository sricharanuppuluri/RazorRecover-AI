import { DemoDataService } from '../services/demo-data.service';
import { seedDatabase } from './seed';
import { getDbPool } from '../config/database';

export async function runDemoSeed(reset = false): Promise<void> {
  console.log(`===================================================`);
  console.log(` RazorRecover AI - Synthetic Demo Data Generator`);
  console.log(` Action: ${reset ? 'RESET & RE-SEED' : 'SEED'}`);
  console.log(`===================================================`);

  try {
    // 1. Try seeding PostgreSQL if available
    const pool = getDbPool();
    if (pool) {
      try {
        console.log('[DemoSeeder] Attempting PostgreSQL seed...');
        await seedDatabase();
        console.log('[DemoSeeder] PostgreSQL seed successful.');
      } catch (err: any) {
        console.log(`[DemoSeeder] PostgreSQL unavailable (${err.message}). Using in-memory DemoDataService.`);
      }
    }

    // 2. Always seed in-memory DemoDataService repositories
    const counts = await DemoDataService.seedAll(reset);
    console.log('[DemoSeeder] Synthetic Demo Data Layer Ready:');
    console.log(`  - Merchants:       ${counts.merchantsCount}`);
    console.log(`  - Customers:       ${counts.customersCount}`);
    console.log(`  - Orders:          ${counts.ordersCount}`);
    console.log(`  - Payments:        ${counts.paymentsCount}`);
    console.log(`  - Recovery Cases:  ${counts.casesCount}`);
    console.log(`  - AI Decisions:    ${counts.aiDecisionsCount}`);
    console.log(`  - Policy Decisions:${counts.policyDecisionsCount}`);
    console.log(`  - Actions:         ${counts.actionsCount}`);
    console.log(`  - Audit Events:    ${counts.auditEventsCount}`);
    console.log(`===================================================`);
  } catch (err: any) {
    console.error('[DemoSeeder Error]', err);
    throw err;
  }
}

if (require.main === module) {
  const isReset = process.argv.includes('--reset');
  runDemoSeed(isReset)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
