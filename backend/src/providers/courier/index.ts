import type { ApiEnv } from '@bookverse/shared';
import { createMockCourierProvider } from './mock.js';
import { createSteadfastCourierProvider } from './steadfast.js';
import type { CourierProvider } from './types.js';

export function createCourierProvider(env: ApiEnv): CourierProvider {
  if (env.COURIER_PROVIDER === 'mock') {
    return createMockCourierProvider(env);
  }
  if (env.COURIER_PROVIDER === 'steadfast') {
    return createSteadfastCourierProvider(env);
  }
  throw new Error(`Unsupported COURIER_PROVIDER: ${env.COURIER_PROVIDER}`);
}

export type { CourierProvider } from './types.js';
