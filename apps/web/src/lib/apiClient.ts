import { apiErrorEnvelopeSchema, apiSuccessEnvelopeSchema } from '@bookverse/shared';
import type { z } from 'zod';
import { getWebEnv } from '../env';

export class ApiError extends Error {
  readonly code: string;
  readonly errors: unknown[];

  constructor(code: string, message: string, errors: unknown[] = []) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.errors = errors;
  }
}

export async function apiFetch<T>(
  path: string,
  dataSchema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const base = getWebEnv().PUBLIC_API_URL.replace(/\/$/, '');
  const res = await fetch(`${base}${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  const json: unknown = await res.json().catch(() => null);
  if (!json || typeof json !== 'object') {
    throw new ApiError('NETWORK_ERROR', 'Invalid response from server');
  }

  const record = json as Record<string, unknown>;
  if (record.success === false) {
    const err = apiErrorEnvelopeSchema.parse(json);
    throw new ApiError(err.code, err.message, err.errors);
  }

  const parsed = apiSuccessEnvelopeSchema(dataSchema).safeParse(json);
  if (!parsed.success) {
    throw new ApiError('PARSE_ERROR', 'Unexpected response shape');
  }
  return parsed.data.data;
}
