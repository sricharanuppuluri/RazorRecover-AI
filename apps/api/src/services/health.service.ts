import { HealthResponse } from '@razorrecover/shared-types';
import { checkDatabaseHealth } from '../config/database';
import { env } from '../config/env';

export class HealthService {
  public async getHealthStatus(): Promise<HealthResponse> {
    const dbHealth = await checkDatabaseHealth();

    return {
      status: 'ok',
      service: 'razorrecover-api',
      timestamp: new Date().toISOString(),
      version: '0.1.0-phase0',
      environment: env.NODE_ENV,
      database: dbHealth
    };
  }

  public async getReadinessStatus(): Promise<{ status: 'ready' | 'not_ready'; service: string; timestamp: string; database: any }> {
    const dbHealth = await checkDatabaseHealth();
    const isReady = dbHealth === 'connected' || dbHealth === 'unconfigured';
    return {
      status: isReady ? 'ready' : 'not_ready',
      service: 'razorrecover-api',
      timestamp: new Date().toISOString(),
      database: dbHealth
    };
  }
}
