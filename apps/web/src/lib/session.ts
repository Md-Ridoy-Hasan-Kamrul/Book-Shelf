import { meUserSchema, apiSuccessEnvelopeSchema } from '@bookverse/shared';
import { getWebEnv } from '../env';

export async function fetchMe(cookieHeader: string) {
  const apiBase = (import.meta.env.API_INTERNAL_URL ?? getWebEnv().PUBLIC_API_URL).replace(
    /\/$/,
    '',
  );
  const res = await fetch(`${apiBase}/me`, {
    headers: { cookie: cookieHeader, accept: 'application/json' },
  });
  if (!res.ok) return null;
  const json: unknown = await res.json();
  return apiSuccessEnvelopeSchema(meUserSchema).parse(json).data;
}
