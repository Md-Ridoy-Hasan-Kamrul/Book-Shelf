import type { ApiEnv, HealthData } from '@bookverse/shared';
import pg from 'pg';
import { createClient } from 'redis';

const { Pool } = pg;

async function pingDatabase(url: string): Promise<void> {
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    await pool.query('SELECT 1');
  } finally {
    await pool.end();
  }
}

async function pingRedis(url: string): Promise<void> {
  const client = createClient({ url });
  client.on('error', () => {});
  await client.connect();
  try {
    const pong = await client.ping();
    if (pong !== 'PONG') {
      throw new Error('Redis ping failed');
    }
  } finally {
    await client.quit();
  }
}

export async function getHealthStatus(env: ApiEnv): Promise<HealthData> {
  if (env.HEALTH_SKIP_INFRA) {
    return { status: 'ok', db: true, redis: true };
  }

  let db = false;
  let redis = false;

  try {
    await pingDatabase(env.DATABASE_URL);
    db = true;
  } catch {
    db = false;
  }

  try {
    await pingRedis(env.REDIS_URL);
    redis = true;
  } catch {
    redis = false;
  }

  return {
    status: db && redis ? 'ok' : 'degraded',
    db,
    redis,
  };
}
