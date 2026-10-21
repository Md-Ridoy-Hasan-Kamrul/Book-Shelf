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

async function withPdfFlags<T extends { slug: string; hasReadablePdf?: boolean }>(
  items: T[],
): Promise<Array<T & { hasReadablePdf: boolean }>> {
  const { bookPdfExists } = await import('./bookPdf');
  return Promise.all(
    items.map(async (b) => ({
      ...b,
      // Always prefer disk: `false ?? x` would skip the file check.
      hasReadablePdf: (await bookPdfExists(b.slug)) || b.hasReadablePdf === true,
    })),
  );
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
    const [withPdf] = await withPdfFlags([b]);
    return bookDetailSchema.parse({
      id: withPdf.id,
      slug: withPdf.slug,
      title: withPdf.title,
      titleBn: withPdf.titleBn,
      author: withPdf.author,
      coverUrl: withPdf.coverUrl,
      minPrice: withPdf.minPrice,
      hasStock: withPdf.hasStock,
      language: withPdf.language,
      genreSlug: withPdf.genreSlug,
      description: withPdf.description,
      descriptionBn: withPdf.descriptionBn,
      authorBn: withPdf.authorBn,
      isbn: withPdf.isbn,
      pageCount: withPdf.pageCount,
      publishedYear: withPdf.publishedYear,
      moodTags: withPdf.moodTags,
      genreName: withPdf.genreName,
      genreNameBn: withPdf.genreNameBn,
      publisherSlug: withPdf.publisherSlug,
      publisherName: withPdf.publisherName,
      writerPenName: withPdf.writerPenName,
      listings: withPdf.listings,
      lookInsidePages: withPdf.lookInsidePages,
      hasReadablePdf: withPdf.hasReadablePdf,
      outOfStock: withPdf.outOfStock,
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
  if (useMockData()) {
    const data = mockSearch(q);
    return { ...data, items: await withPdfFlags(data.items) };
  }
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
