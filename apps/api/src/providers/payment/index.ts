import type { ApiEnv } from '@bookverse/shared';
import { createMockPaymentProvider } from './mock.js';
import { createSslCommerzPaymentProvider } from './sslcommerz.js';
import type { PaymentProvider } from './types.js';

export function createPaymentProvider(env: ApiEnv): PaymentProvider {
  if (env.PAYMENT_PROVIDER === 'mock') {
    return createMockPaymentProvider(env);
  }
  if (env.PAYMENT_PROVIDER === 'sslcommerz') {
    return createSslCommerzPaymentProvider(env);
  }
  throw new Error(`Unsupported PAYMENT_PROVIDER: ${env.PAYMENT_PROVIDER}`);
}

export type { PaymentProvider } from './types.js';
