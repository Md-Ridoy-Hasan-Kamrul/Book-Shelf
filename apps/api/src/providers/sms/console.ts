import type { Logger } from '../../lib/logger.js';
import type { SmsProvider } from './types.js';

export function createConsoleSmsProvider(logger: Logger): SmsProvider {
  return {
    kind: 'console',
    async sendOtp(phone, code) {
      logger.info({ phone, code }, '[SmsProvider:console] OTP (local only — not sent over SMS)');
    },
  };
}
