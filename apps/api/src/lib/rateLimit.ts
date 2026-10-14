import type { ApiEnv } from '@bookverse/shared';
import { AppError } from './appError.js';
import { getRedis } from './redis.js';

export async function consumeRateLimit(
  env: ApiEnv,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  if (env.NODE_ENV === 'test' && env.HEALTH_SKIP_INFRA) {
    return;
  }
  const redis = await getRedis(env);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  if (count > limit) {
    throw new AppError('RATE_LIMITED', 'Too many requests', 429);
  }
}

export function clientIp(req: {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.ip ?? 'unknown';
}
