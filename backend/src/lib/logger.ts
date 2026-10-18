import pino from 'pino';
import type { ApiEnv } from '@bookverse/shared';

export function createLogger(env: ApiEnv) {
  return pino({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
