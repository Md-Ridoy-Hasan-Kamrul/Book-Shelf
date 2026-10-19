import { describe, expect, test } from 'vitest';
import { loadApiEnv } from '@bookverse/shared';
import { mintTrackingId, verifyTrackingId } from './trackingId.js';

describe('signed tracking ids', () => {
  const env = loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'true' });

  test('round-trips payload', () => {
    const id = mintTrackingId(env, {
      campaignId: 'camp1',
      listingId: 'list1',
      bookId: 'book1',
    });
    const payload = verifyTrackingId(env, id);
    expect(payload?.campaignId).toBe('camp1');
    expect(payload?.listingId).toBe('list1');
  });

  test('rejects tampered signature', () => {
    const id = mintTrackingId(env, {
      campaignId: 'camp1',
      listingId: 'list1',
      bookId: 'book1',
    });
    expect(verifyTrackingId(env, `${id}x`)).toBeNull();
    expect(verifyTrackingId(env, 'not.a.valid')).toBeNull();
  });
});
