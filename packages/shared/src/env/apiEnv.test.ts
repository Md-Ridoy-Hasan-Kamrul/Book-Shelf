import { describe, expect, test } from 'vitest';
import { loadApiEnv } from './apiEnv.js';

describe('loadApiEnv', () => {
  test('applies defaults for local dev', () => {
    const env = loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'true' });
    expect(env.PORT).toBe(4000);
    expect(env.WEB_ORIGIN).toBe('http://localhost:4321');
    expect(env.DIRECT_URL).toBe(env.DATABASE_URL);
  });

  test('fails fast on invalid PORT', () => {
    expect(() => loadApiEnv({ PORT: 'nope' })).toThrow(/Invalid API environment/);
  });

  test('treats FEATURE_*=false string as false (not Boolean("false"))', () => {
    const env = loadApiEnv({
      NODE_ENV: 'test',
      FEATURE_LIVE_EVENTS: 'false',
      FEATURE_USED_BOOKS: 'false',
      HEALTH_SKIP_INFRA: 'false',
    });
    expect(env.FEATURE_LIVE_EVENTS).toBe(false);
    expect(env.FEATURE_USED_BOOKS).toBe(false);
    expect(env.HEALTH_SKIP_INFRA).toBe(false);
  });

  test('treats FEATURE_*=true / 1 as true', () => {
    const env = loadApiEnv({
      NODE_ENV: 'test',
      FEATURE_LIVE_EVENTS: 'true',
      FEATURE_SPONSORED: '1',
    });
    expect(env.FEATURE_LIVE_EVENTS).toBe(true);
    expect(env.FEATURE_SPONSORED).toBe(true);
  });
});
