import type { ApiEnv } from '@bookverse/shared';

/** TEST_CLOCK_ISO overrides "now" for local escrow / claim windows. */
export function appNow(env: ApiEnv): Date {
  const iso = process.env.TEST_CLOCK_ISO?.trim();
  if (iso && env.NODE_ENV !== 'production') {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
