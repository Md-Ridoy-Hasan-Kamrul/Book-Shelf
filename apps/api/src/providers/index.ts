import type { ApiEnv } from '@bookverse/shared';

export type ProviderKind = 'storage' | 'email' | 'sms' | 'payment' | 'courier' | 'llm' | 'search';

export type ProviderRegistry = Record<ProviderKind, string>;

export function createProviderRegistry(env: ApiEnv): ProviderRegistry {
  return {
    storage: env.STORAGE_PROVIDER,
    email: env.EMAIL_PROVIDER,
    sms: env.SMS_PROVIDER,
    payment: env.PAYMENT_PROVIDER,
    courier: env.COURIER_PROVIDER,
    llm: env.LLM_PROVIDER,
    search: env.SEARCH_PROVIDER,
  };
}
