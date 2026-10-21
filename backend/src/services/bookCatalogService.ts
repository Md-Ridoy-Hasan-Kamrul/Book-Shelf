import type { ApiEnv } from '@bookverse/shared';
import type { z } from 'zod';
import type { booksListQuerySchema } from '@bookverse/shared';
import { AppError } from '../lib/appError.js';
import { prisma } from '../lib/prisma.js';
import type { StorageProvider } from '../providers/storage/types.js';
import { bookPdfExists } from './bookPdfService.js';

type ListQuery = z.infer<typeof booksListQuerySchema>;

function coverUrl(env: ApiEnv, storage: StorageProvider, key: string | null) {
  if (!key) return null;
  return storage.resolvePublicUrl(key);
}

export async function listBooks(
  env: ApiEnv,
  storage: StorageProvider,
  query: ListQuery,
  featureUsedBooks: boolean,
) {
  const take = query.limit + 1;
  const cursorParts = query.cursor?.split('|');
  const cursorCreatedAt = cursorParts?.[0];
  const cursorId = cursorParts?.[1];

  const listingWhere: Record<string, unknown> = { status: 'ACTIVE' };
  if (query.condition) listingWhere.condition = query.condition;
  if (query.type === 'NEW') {
    listingWhere.condition = 'NEW';
  } else if (query.type === 'USED') {
    if (!featureUsedBooks) {
      throw new AppError('FORBIDDEN', 'Used books module is disabled', 403);
    }
    listingWhere.NOT = { condition: 'NEW' };
  }

  const books = await prisma.book.findMany({
    where: {
      ...(query.language ? { language: query.language } : {}),
      ...(query.author ? { author: { contains: query.author, mode: 'insensitive' as const } } : {}),
      ...(query.publisher ? { publisher: { slug: query.publisher } } : {}),
      ...(query.genre ? { genre: { slug: query.genre } } : {}),
      listings: { some: listingWhere },
      ...(cursorCreatedAt && cursorId
        ? {
            OR: [
              { createdAt: { lt: new Date(cursorCreatedAt) } },
              { createdAt: new Date(cursorCreatedAt), id: { lt: cursorId } },
            ],
          }
        : {}),
    },
    include: {
      genre: { select: { slug: true } },
      listings: {
        where: listingWhere,
        select: { price: true, stock: true },
      },
    },
    orderBy: query.sort === 'title' ? { title: 'asc' } : [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });

  const filtered = books
    .map((b) => {
      const prices = b.listings.map((l) => Number(l.price));
      const minPrice = prices.length ? Math.min(...prices).toFixed(2) : null;
      if (query.minPrice != null && minPrice != null && Number(minPrice) < query.minPrice) {
        return null;
      }
      if (query.maxPrice != null && minPrice != null && Number(minPrice) > query.maxPrice) {
        return null;
      }
      const hasStock = b.listings.some((l) => l.stock > 0);
      return {
        id: b.id,
        slug: b.slug,
        title: b.title,
        titleBn: b.titleBn,
        author: b.author,
        coverUrl: coverUrl(env, storage, b.coverKey),
        minPrice,
        hasStock,
        language: b.language,
        genreSlug: b.genre.slug,
        createdAt: b.createdAt,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    slug: string;
    title: string;
    titleBn: string;
    author: string;
    coverUrl: string | null;
    minPrice: string | null;
    hasStock: boolean;
    language: string;
    genreSlug: string;
    createdAt: Date;
  }>;

  if (query.sort === 'price_asc' || query.sort === 'price_desc') {
    filtered.sort((a, b) => {
      const pa = a.minPrice ? Number(a.minPrice) : Number.POSITIVE_INFINITY;
      const pb = b.minPrice ? Number(b.minPrice) : Number.POSITIVE_INFINITY;
      return query.sort === 'price_asc' ? pa - pb : pb - pa;
    });
  }

  const page = filtered.slice(0, query.limit);
  const last = page[page.length - 1];
  const nextCursor =
    filtered.length > query.limit && last ? `${last.createdAt.toISOString()}|${last.id}` : null;

  return {
    items: page.map(({ createdAt: _c, ...rest }) => rest),
    nextCursor,
  };
}

export async function getBookBySlug(env: ApiEnv, storage: StorageProvider, slug: string) {
  const book = await prisma.book.findUnique({
    where: { slug },
    include: {
      genre: true,
      publisher: true,
      writer: true,
      listings: {
        where: { status: 'ACTIVE' },
        include: {
          seller: { select: { name: true, displayName: true } },
          vendor: { select: { shopName: true } },
        },
        orderBy: { price: 'asc' },
      },
      lookInside: true,
    },
  });
  if (!book) {
    throw new AppError('NOT_FOUND', 'Book not found', 404);
  }

  const listings = book.listings.map((l) => ({
    id: l.id,
    price: l.price.toString(),
    stock: l.stock,
    condition: l.condition,
    sellerType: l.sellerType,
    sellerName: l.vendor?.shopName ?? l.seller.displayName ?? l.seller.name,
  }));

  const prices = listings.map((l) => Number(l.price));
  const minPrice = prices.length ? Math.min(...prices).toFixed(2) : null;
  const hasStock = listings.some((l) => l.stock > 0);

  const releaseRow = await prisma.bookRelease.findUnique({ where: { bookId: book.id } });
  const now = Date.now();
  const release = releaseRow
    ? {
        releaseAt: releaseRow.releaseAt.toISOString(),
        preorderEnabled: releaseRow.preorderEnabled,
        serverNow: new Date(now).toISOString(),
        msUntilRelease: Math.max(0, releaseRow.releaseAt.getTime() - now),
      }
    : null;

  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    titleBn: book.titleBn,
    author: book.author,
    authorBn: book.authorBn,
    description: book.description,
    descriptionBn: book.descriptionBn,
    isbn: book.isbn,
    pageCount: book.pageCount,
    publishedYear: book.publishedYear,
    moodTags: book.moodTags,
    language: book.language,
    coverUrl: coverUrl(env, storage, book.coverKey),
    minPrice,
    hasStock,
    outOfStock: !hasStock,
    genreId: book.genreId,
    genreSlug: book.genre.slug,
    genreName: book.genre.name,
    genreNameBn: book.genre.nameBn,
    publisherSlug: book.publisher?.slug ?? null,
    publisherName: book.publisher?.businessName ?? null,
    writerPenName: book.writer?.penName ?? null,
    listings,
    lookInsidePages:
      book.lookInside?.status === 'APPROVED'
        ? book.lookInside.pageKeys.map((k) => storage.resolvePublicUrl(k))
        : undefined,
    hasReadablePdf: await bookPdfExists(book.slug),
    release,
  };
}
