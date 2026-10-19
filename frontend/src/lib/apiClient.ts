import { apiErrorEnvelopeSchema, apiSuccessEnvelopeSchema } from '@bookverse/shared';
import type { z } from 'zod';
import { getWebEnv } from '../env';
import { useMockData } from './mockMode';
import { resolveMockApi } from './mockApi';

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

function pathOnly(path: string) {
  return path.startsWith('http') ? new URL(path).pathname + new URL(path).search : path;
}

export async function apiFetch<T>(
  path: string,
  dataSchema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  if (useMockData()) {
    let body: unknown;
    if (typeof init?.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = undefined;
      }
    }
    const raw = resolveMockApi(pathOnly(path), init?.method ?? 'GET', body);
    const parsed = dataSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    // Soften: try wrapping common list shapes
    const wrapped = dataSchema.safeParse({
      items: [],
      ...(typeof raw === 'object' && raw ? raw : {}),
    });
    if (wrapped.success) return wrapped.data;
    throw new ApiError('MOCK_MISS', `Mock parse failed for ${path}`);
  }

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

export async function apiFetchPaged<T>(
  path: string,
  dataSchema: z.ZodType<T>,
  init?: RequestInit,
): Promise<{ data: T; meta: Record<string, unknown> }> {
  if (useMockData()) {
    let body: unknown;
    if (typeof init?.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = undefined;
      }
    }
    const raw = resolveMockApi(pathOnly(path), init?.method ?? 'GET', body);
    const parsed = dataSchema.safeParse(raw);
    if (parsed.success) {
      const meta =
        raw && typeof raw === 'object' && 'nextCursor' in raw
          ? { nextCursor: (raw as { nextCursor: unknown }).nextCursor }
          : {};
      return { data: parsed.data, meta };
    }
    throw new ApiError('MOCK_MISS', `Mock paged parse failed for ${path}`);
  }

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
  return { data: parsed.data.data, meta: parsed.data.meta ?? {} };
}
