import type { ApiEnv } from '@bookverse/shared';
import { createLocalStorageProvider } from './local.js';
import type { StorageProvider } from './types.js';

export type { StorageProvider } from './types.js';

export function createStorageProvider(env: ApiEnv): StorageProvider {
  if (env.STORAGE_PROVIDER === 'local') {
    return createLocalStorageProvider(env);
  }
  throw new Error(`Unsupported STORAGE_PROVIDER: ${env.STORAGE_PROVIDER}`);
}
