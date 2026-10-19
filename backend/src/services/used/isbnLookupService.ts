import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/appError.js';
import { assertSafeExternalUrl, safeFetch } from '../../lib/ssrfGuard.js';

export type IsbnBookMeta = {
  isbn: string;
  title: string;
  titleBn: string | null;
  authors: string[];
  description: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  publishedYear: number | null;
  language: string | null;
  source: string;
};

function normalizeIsbn(raw: string): string {
  return raw.replace(/[-\s]/g, '');
}

function sanitizeCoverUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    assertSafeExternalUrl(raw);
    return raw;
  } catch {
    return null;
  }
}

async function fromOpenLibrary(isbn: string): Promise<IsbnBookMeta | null> {
  const res = await safeFetch(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`, {
    headers: { Accept: 'application/json' },
  });
  if (!res?.ok) return null;
  const data = (await res.json()) as {
    title?: string;
    number_of_pages?: number;
    publish_date?: string;
    covers?: number[];
    languages?: Array<{ key: string }>;
    authors?: Array<{ key: string }>;
    description?: string | { value?: string };
  };
  if (!data.title) return null;

  let authors: string[] = [];
  if (data.authors?.length) {
    const names = await Promise.all(
      data.authors.slice(0, 3).map(async (a) => {
        if (!a.key?.startsWith('/authors/')) return null;
        const ar = await safeFetch(`https://openlibrary.org${a.key}.json`);
        if (!ar?.ok) return null;
        const aj = (await ar.json()) as { name?: string };
        return aj.name ?? null;
      }),
    );
    authors = names.filter((n): n is string => Boolean(n));
  }

  const yearMatch = data.publish_date?.match(/\d{4}/);
  const desc =
    typeof data.description === 'string' ? data.description : (data.description?.value ?? null);

  return {
    isbn,
    title: data.title,
    titleBn: null,
    authors,
    description: desc,
    coverUrl: sanitizeCoverUrl(
      data.covers?.[0] ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg` : null,
    ),
    pageCount: data.number_of_pages ?? null,
    publishedYear: yearMatch ? Number(yearMatch[0]) : null,
    language: data.languages?.[0]?.key?.replace('/languages/', '') ?? null,
    source: 'openlibrary',
  };
}

async function fromGoogleBooks(isbn: string): Promise<IsbnBookMeta | null> {
  const res = await safeFetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`,
  );
  if (!res?.ok) return null;
  const data = (await res.json()) as {
    items?: Array<{
      volumeInfo?: {
        title?: string;
        authors?: string[];
        description?: string;
        pageCount?: number;
        publishedDate?: string;
        language?: string;
        imageLinks?: { thumbnail?: string; smallThumbnail?: string };
      };
    }>;
  };
  const info = data.items?.[0]?.volumeInfo;
  if (!info?.title) return null;
  const yearMatch = info.publishedDate?.match(/\d{4}/);
  return {
    isbn,
    title: info.title,
    titleBn: null,
    authors: info.authors ?? [],
    description: info.description ?? null,
    coverUrl: sanitizeCoverUrl(
      info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null,
    ),
    pageCount: info.pageCount ?? null,
    publishedYear: yearMatch ? Number(yearMatch[0]) : null,
    language: info.language ?? null,
    source: 'google_books',
  };
}

export async function lookupIsbn(rawIsbn: string): Promise<IsbnBookMeta> {
  const isbn = normalizeIsbn(rawIsbn);
  if (!/^\d{9}[\dXx]$|^\d{13}$/.test(isbn) || isbn.length < 10) {
    throw new AppError('VALIDATION_ERROR', 'Invalid ISBN', 400);
  }

  const cached = await prisma.isbnCache.findUnique({ where: { isbn } });
  if (cached) {
    return {
      isbn: cached.isbn,
      title: cached.title,
      titleBn: cached.titleBn,
      authors: cached.authors,
      description: cached.description,
      coverUrl: cached.coverUrl,
      pageCount: cached.pageCount,
      publishedYear: cached.publishedYear,
      language: cached.language,
      source: cached.source,
    };
  }

  const meta = (await fromOpenLibrary(isbn)) ?? (await fromGoogleBooks(isbn));
  if (!meta) {
    throw new AppError('NOT_FOUND', 'No book found for this ISBN', 404);
  }

  await prisma.isbnCache.upsert({
    where: { isbn },
    create: {
      isbn: meta.isbn,
      title: meta.title,
      titleBn: meta.titleBn,
      authors: meta.authors,
      description: meta.description,
      coverUrl: meta.coverUrl,
      pageCount: meta.pageCount,
      publishedYear: meta.publishedYear,
      language: meta.language,
      source: meta.source,
    },
    update: {
      title: meta.title,
      authors: meta.authors,
      description: meta.description,
      coverUrl: meta.coverUrl,
      pageCount: meta.pageCount,
      publishedYear: meta.publishedYear,
      language: meta.language,
      source: meta.source,
    },
  });

  return meta;
}
