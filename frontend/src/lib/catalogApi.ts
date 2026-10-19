import {
  bookDetailSchema,
  bookCardSchema,
  searchSuggestSchema,
  apiSuccessEnvelopeSchema,
} from '@bookverse/shared';
import { z } from 'zod';
import { getWebEnv } from '../env';
import { useMockData } from './mockMode';
import { mockBookBySlug, mockBookCards, mockSearch, mockSuggest } from './mockCatalog';

const listSchema = z.object({
  items: z.array(bookCardSchema),
  nextCursor: z.string().nullable(),
});

function apiBase() {
  return (import.meta.env.API_INTERNAL_URL ?? getWebEnv().PUBLIC_API_URL).replace(/\/$/, '');
}

export async function fetchBooks(query: Record<string, string | undefined>) {
  if (useMockData()) {
    const limit = Number(query.limit ?? 24) || 24;
    return { items: mockBookCards(limit), nextCursor: null };
  }
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
  if (useMockData()) {
    const b = mockBookBySlug(slug);
    if (!b) return null;
    return bookDetailSchema.parse({
      id: b.id,
      slug: b.slug,
      title: b.title,
      titleBn: b.titleBn,
      author: b.author,
      coverUrl: b.coverUrl,
      minPrice: b.minPrice,
      hasStock: b.hasStock,
      language: b.language,
      genreSlug: b.genreSlug,
      description: b.description,
      descriptionBn: b.descriptionBn,
      authorBn: b.authorBn,
      isbn: b.isbn,
      pageCount: b.pageCount,
      publishedYear: b.publishedYear,
      moodTags: b.moodTags,
      genreName: b.genreName,
      genreNameBn: b.genreNameBn,
      publisherSlug: b.publisherSlug,
      publisherName: b.publisherName,
      writerPenName: b.writerPenName,
      listings: b.listings,
      lookInsidePages: b.lookInsidePages,
      outOfStock: b.outOfStock,
    });
  }
  const res = await fetch(`${apiBase()}/books/${encodeURIComponent(slug)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const json: unknown = await res.json();
  const parsed = apiSuccessEnvelopeSchema(bookDetailSchema).parse(json);
  return parsed.data;
}

export async function searchBooks(q: string) {
  if (useMockData()) return mockSearch(q);
  const res = await fetch(`${apiBase()}/search?${new URLSearchParams({ q })}`, {
    headers: { Accept: 'application/json' },
  });
  const json: unknown = await res.json();
  const parsed = apiSuccessEnvelopeSchema(listSchema).parse(json);
  return parsed.data;
}

export async function suggestSearch(q: string) {
  if (useMockData()) return mockSuggest(q);
  const res = await fetch(`${apiBase()}/search/suggest?${new URLSearchParams({ q })}`, {
    headers: { Accept: 'application/json' },
  });
  const json: unknown = await res.json();
  const parsed = apiSuccessEnvelopeSchema(searchSuggestSchema).parse(json);
  return parsed.data;
}
