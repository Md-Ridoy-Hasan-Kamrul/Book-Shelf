import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ApiEnv } from '@bookverse/shared';

export type TrackingPayload = {
  campaignId: string;
  listingId: string;
  bookId: string;
  exp: number;
};

function b64url(buf: Buffer | string) {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
  return b.toString('base64url');
}

function sign(env: ApiEnv, payloadB64: string) {
  return createHmac('sha256', env.BETTER_AUTH_SECRET).update(payloadB64).digest('base64url');
}

export function mintTrackingId(
  env: ApiEnv,
  payload: Omit<TrackingPayload, 'exp'>,
  ttlSec = 86_400,
) {
  const body: TrackingPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec };
  const payloadB64 = b64url(JSON.stringify(body));
  return `${payloadB64}.${sign(env, payloadB64)}`;
}

export function verifyTrackingId(env: ApiEnv, trackingId: string): TrackingPayload | null {
  const [payloadB64, sig] = trackingId.split('.');
  if (!payloadB64 || !sig) return null;
  const expected = sign(env, payloadB64);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as TrackingPayload;
    if (!parsed.campaignId || !parsed.listingId || !parsed.bookId || !parsed.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}
