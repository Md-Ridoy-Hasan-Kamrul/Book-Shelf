import { randomUUID } from 'node:crypto';
import type { ApiEnv, MeUser } from '@bookverse/shared';
import type { z } from 'zod';
import type { usedListingCreateSchema } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { lookupIsbn } from './isbnLookupService.js';

type CreateInput = z.infer<typeof usedListingCreateSchema>;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function assertFeature(env: ApiEnv) {
  if (!env.FEATURE_USED_BOOKS) {
    throw new AppError('FORBIDDEN', 'Used books module is disabled', 403);
  }
}

/** Verified email or phone required to sell used books. */
async function assertVerifiedSeller(user: MeUser) {
  const row = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { emailVerified: true, phoneVerified: true, bannedAt: true },
  });
  if (row.bannedAt) throw new AppError('FORBIDDEN', 'Account banned', 403);
  if (!row.emailVerified && !row.phoneVerified) {
    throw new AppError('FORBIDDEN', 'Verify email or phone before selling used books', 403);
  }
}

export async function createUsedListing(user: MeUser, env: ApiEnv, input: CreateInput) {
  assertFeature(env);
  await assertVerifiedSeller(user);

  if (input.photoKeys.length < 2) {
    throw new AppError('VALIDATION_ERROR', 'At least 2 photos required', 400);
  }

  let bookId = input.bookId;
  if (!bookId) {
    let title = input.title;
    let titleBn = input.titleBn ?? input.title;
    let author = input.author;
    let isbn = input.isbn?.replace(/[-\s]/g, '');
    let pageCount: number | undefined;
    let publishedYear: number | undefined;
    let description = input.description;

    if (isbn) {
      const meta = await lookupIsbn(isbn);
      title = title ?? meta.title;
      titleBn = titleBn ?? meta.titleBn ?? meta.title;
      author = author ?? meta.authors[0] ?? 'Unknown';
      pageCount = meta.pageCount ?? undefined;
      publishedYear = meta.publishedYear ?? undefined;
      description = description || meta.description || input.description;
      const existing = await prisma.book.findUnique({ where: { isbn } });
      if (existing) bookId = existing.id;
    }

    if (!bookId) {
      if (!title || !author) {
        throw new AppError('VALIDATION_ERROR', 'Book id, ISBN, or title+author required', 400);
      }
      const genre = await prisma.genre.findUnique({
        where: { slug: input.genreSlug ?? 'fiction' },
      });
      if (!genre) throw new AppError('VALIDATION_ERROR', 'Unknown genre', 400);

      const book = await prisma.book.create({
        data: {
          slug: slugify(`${title}-${randomUUID().slice(0, 6)}`),
          title,
          titleBn: titleBn ?? title,
          author,
          description,
          isbn: isbn ?? undefined,
          pageCount,
          publishedYear,
          genreId: genre.id,
          language: 'bn',
        },
      });
      bookId = book.id;
    }
  } else {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new AppError('NOT_FOUND', 'Book not found', 404);
  }

  const priorUsed = await prisma.listing.count({
    where: { sellerId: user.id, isUsed: true },
  });
  const status = priorUsed === 0 ? 'PENDING_MODERATION' : 'ACTIVE';

  const listing = await prisma.listing.create({
    data: {
      bookId: bookId!,
      sellerId: user.id,
      sellerType: 'USER',
      price: input.price,
      stock: 1,
      condition: input.condition,
      status,
      isUsed: true,
      photoKeys: input.photoKeys,
      description: input.description,
      district: input.district,
      area: input.area,
      fulfillment: input.fulfillment,
    },
    include: {
      book: { select: { id: true, slug: true, title: true, author: true, isbn: true } },
    },
  });

  return {
    id: listing.id,
    status: listing.status,
    needsModeration: status === 'PENDING_MODERATION',
    book: listing.book,
    price: listing.price.toFixed(2),
    condition: listing.condition,
    district: listing.district,
    area: listing.area,
  };
}

export async function listNearMe(
  env: ApiEnv,
  district?: string,
  area?: string,
  cursor?: string,
  limit = 24,
) {
  assertFeature(env);
  const take = limit + 1;
  const cursorParts = cursor?.split('|');
  const rows = await prisma.listing.findMany({
    where: {
      isUsed: true,
      status: 'ACTIVE',
      stock: { gt: 0 },
      ...(district ? { district: { equals: district, mode: 'insensitive' } } : {}),
      ...(area ? { area: { equals: area, mode: 'insensitive' } } : {}),
      ...(cursorParts?.[0] && cursorParts[1]
        ? {
            OR: [
              { createdAt: { lt: new Date(cursorParts[0]) } },
              { createdAt: new Date(cursorParts[0]), id: { lt: cursorParts[1] } },
            ],
          }
        : {}),
    },
    include: {
      book: {
        select: { id: true, slug: true, title: true, titleBn: true, author: true, coverKey: true },
      },
      seller: { select: { id: true, displayName: true, name: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((l) => ({
      id: l.id,
      price: l.price.toFixed(2),
      condition: l.condition,
      district: l.district,
      area: l.area,
      fulfillment: l.fulfillment,
      photoKeys: l.photoKeys,
      book: l.book,
      sellerName: l.seller.displayName ?? l.seller.name,
      createdAt: l.createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
  };
}

export async function moderateUsedListing(adminId: string, listingId: string, approve: boolean) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing?.isUsed) throw new AppError('NOT_FOUND', 'Used listing not found', 404);
  if (listing.status !== 'PENDING_MODERATION') {
    throw new AppError('CONFLICT', 'Listing is not awaiting moderation', 409);
  }
  return prisma.listing.update({
    where: { id: listingId },
    data: {
      status: approve ? 'ACTIVE' : 'REMOVED',
      moderatedAt: new Date(),
      moderatedById: adminId,
    },
  });
}

export async function listPendingUsedListings() {
  return prisma.listing.findMany({
    where: { isUsed: true, status: 'PENDING_MODERATION' },
    include: {
      book: { select: { title: true, author: true, isbn: true } },
      seller: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
}

export async function reportUsedListing(userId: string, listingId: string, reason: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing?.isUsed) throw new AppError('NOT_FOUND', 'Listing not found', 404);
  await prisma.report.create({
    data: {
      reporterId: userId,
      targetType: 'LISTING',
      targetId: listingId,
      reason,
    },
  });
}

export async function rateSellerAfterDelivery(
  buyerId: string,
  orderId: string,
  rating: number,
  body?: string,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lineItems: { take: 1 } },
  });
  if (!order || order.buyerId !== buyerId) throw new AppError('NOT_FOUND', 'Order not found', 404);
  if (order.status !== 'DELIVERED') {
    throw new AppError('FORBIDDEN', 'Rate only after delivery', 403);
  }
  try {
    return await prisma.sellerRating.create({
      data: {
        orderId,
        buyerId,
        sellerId: order.sellerId,
        listingId: order.lineItems[0]?.listingId ?? undefined,
        rating,
        body,
      },
    });
  } catch {
    throw new AppError('CONFLICT', 'Already rated', 409);
  }
}
