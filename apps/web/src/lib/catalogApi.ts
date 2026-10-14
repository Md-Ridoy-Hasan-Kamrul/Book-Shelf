import {
  bookDetailSchema,
  bookCardSchema,
  searchSuggestSchema,
  apiSuccessEnvelopeSchema,
} from '@bookverse/shared';
import { z } from 'zod';
import { getWebEnv } from '../env';

const listSchema = z.object({
  items: z.array(bookCardSchema),
  nextCursor: z.string().nullable(),
});

function apiBase() {
  return (import.meta.env.API_INTERNAL_URL ?? getWebEnv().PUBLIC_API_URL).replace(/\/$/, '');
}

export async function fetchBooks(query: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v) params.set(k, v);
  }
  const res = await fetch(`${apiBase()}/books?${params}`, {
    headers: { Accept: 'application/json' },
  });
  const json: unknown = await res.json();
  const parsed = apiSuccessEnvelopeSchema(listSchema).parse(json);
  return parsed.data;
}

export async function fetchBookBySlug(slug: string) {
  const res = await fetch(`${apiBase()}/books/${encodeURIComponent(slug)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const json: unknown = await res.json();
  const parsed = apiSuccessEnvelopeSchema(bookDetailSchema).parse(json);
  return parsed.data;
}

export async function searchBooks(q: string) {
  const res = await fetch(`${apiBase()}/search?${new URLSearchParams({ q })}`, {
    headers: { Accept: 'application/json' },
  });
  const json: unknown = await res.json();
  const parsed = apiSuccessEnvelopeSchema(listSchema).parse(json);
  return parsed.data;
}

export async function suggestSearch(q: string) {
  const res = await fetch(`${apiBase()}/search/suggest?${new URLSearchParams({ q })}`, {
    headers: { Accept: 'application/json' },
  });
  const json: unknown = await res.json();
  const parsed = apiSuccessEnvelopeSchema(searchSuggestSchema).parse(json);
  return parsed.data;
}
