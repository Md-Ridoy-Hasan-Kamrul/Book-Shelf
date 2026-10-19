import { Redis, type RedisOptions } from 'ioredis';
import type { ApiEnv } from '@bookverse/shared';

let loggedRedisDown = false;

function attachQuietErrorHandler(client: Redis): void {
  client.on('error', (err: Error) => {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ECONNRESET') {
      if (!loggedRedisDown) {
        loggedRedisDown = true;
        console.error(
          `[redis] ${err.message}\n` +
            '  → Start infra: install Docker Desktop, then run `pnpm docker:up`\n' +
            '  → Redis must listen on REDIS_URL (default redis://localhost:6379)',
        );
      }
      return;
    }
    console.error('[redis]', err.message);
  });
}

/**
 * BullMQ-compatible ioredis client.
 * Suppresses reconnect spam when Redis is down (log once).
 */
export function createBullmqConnection(env: ApiEnv, overrides: RedisOptions = {}): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times) {
      return Math.min(times * 500, 30_000);
    },
    ...overrides,
  });
  attachQuietErrorHandler(client);
  return client;
}

/** One-shot ping; does not leave a long-lived connection. */
export async function pingRedis(env: ApiEnv, timeoutMs = 2000): Promise<boolean> {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: timeoutMs,
    enableOfflineQueue: false,
    retryStrategy: () => null,
    lazyConnect: true,
  });
  attachQuietErrorHandler(client);
  try {
    await client.connect();
    const pong = await client.ping();
    return pong === 'PONG';
  } catch {
    return false;
  } finally {
    client.disconnect();
  }
}
