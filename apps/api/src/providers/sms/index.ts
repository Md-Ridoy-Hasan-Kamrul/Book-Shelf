import type { ApiEnv } from '@bookverse/shared';
import type { Logger } from '../../lib/logger.js';
import { createConsoleSmsProvider } from './console.js';
import type { SmsProvider } from './types.js';

export type { SmsProvider } from './types.js';

export function createSmsProvider(env: ApiEnv, logger: Logger): SmsProvider {
  if (env.SMS_PROVIDER === 'console') {
    return createConsoleSmsProvider(logger);
  }
  throw new Error(`Unsupported SMS_PROVIDER: ${env.SMS_PROVIDER}`);
}
