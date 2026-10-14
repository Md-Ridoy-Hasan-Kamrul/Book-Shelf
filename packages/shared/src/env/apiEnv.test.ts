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
});
