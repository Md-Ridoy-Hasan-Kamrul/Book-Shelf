import { createClient, type RedisClientType } from 'redis';
import type { ApiEnv } from '@bookverse/shared';

let client: RedisClientType | null = null;

export async function getRedis(env: ApiEnv): Promise<RedisClientType> {
  if (!client) {
    client = createClient({ url: env.REDIS_URL });
    client.on('error', () => {
      /* logged at call sites */
    });
    await client.connect();
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
