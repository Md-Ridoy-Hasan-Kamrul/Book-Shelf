import type { ApiEnv } from '@bookverse/shared';
import { createSmtpEmailProvider } from './smtp.js';
import type { EmailProvider } from './types.js';

export type { EmailProvider, SendEmailInput } from './types.js';

export function createEmailProvider(env: ApiEnv): EmailProvider {
  if (env.EMAIL_PROVIDER === 'smtp') {
    return createSmtpEmailProvider(env);
  }
  throw new Error(`Unsupported EMAIL_PROVIDER: ${env.EMAIL_PROVIDER}`);
}
