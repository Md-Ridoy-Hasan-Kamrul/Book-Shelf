import type { z } from 'zod';
import type { reviewCreateSchema } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { cursorWhere, encodeCursor } from '../../lib/cursorPagination.js';
import { prisma } from '../../lib/prisma.js';
import { getSystemSetting } from '../settings/systemSettingsService.js';

type CreateInput = z.infer<typeof reviewCreateSchema>;

async function userHasVerifiedPurchase(userId: string, bookId: string): Promise<boolean> {
  const line = await prisma.orderLineItem.findFirst({
    where: {
      bookId,
      order: { buyerId: userId, status: 'DELIVERED' },
    },
  });
  return Boolean(line);
}

export async function createReview(userId: string, bookId: string, input: CreateInput) {
  const minChars = await getSystemSetting<number>('review_min_chars', 20);
  if (input.body.length < minChars) {
    throw new AppError('VALIDATION_ERROR', `Review must be at least ${minChars} characters`, 400);
  }

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw new AppError('NOT_FOUND', 'Book not found', 404);

  const verified = await userHasVerifiedPurchase(userId, bookId);

  try {
    return await prisma.review.create({
      data: {
        userId,
        bookId,
        rating: input.rating,
        body: input.body,
        hasSpoiler: input.hasSpoiler,
        images: input.images,
        isVerifiedBuyer: verified,
      },
    });
  } catch {
    throw new AppError('CONFLICT', 'You already reviewed this book', 409);
  }
}

export async function listBookReviews(bookId: string, cursor?: string, limit = 20) {
  const take = limit + 1;
  const rows = await prisma.review.findMany({
    where: { bookId, ...(cursorWhere(cursor) ?? {}) },
    include: { user: { select: { name: true, displayName: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];

  const verified = page.filter((r) => r.isVerifiedBuyer);
  const community = page.filter((r) => !r.isVerifiedBuyer);

  const mapRow = (r: (typeof page)[0]) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    hasSpoiler: r.hasSpoiler,
    images: r.images,
    helpfulCount: r.helpfulCount,
    isVerifiedBuyer: r.isVerifiedBuyer,
    authorName: r.user.displayName ?? r.user.name,
    createdAt: r.createdAt.toISOString(),
  });

  return {
    verified: verified.map(mapRow),
    community: community.map(mapRow),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

export async function markReviewHelpful(userId: string, reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError('NOT_FOUND', 'Review not found', 404);

  try {
    await prisma.reaction.create({
      data: {
        userId,
        targetType: 'REVIEW',
        targetId: reviewId,
        kind: 'LIKE',
      },
    });
    await prisma.review.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
    });
  } catch {
    throw new AppError('CONFLICT', 'Already marked helpful', 409);
  }
}

export async function reportReview(userId: string, reviewId: string, reason: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError('NOT_FOUND', 'Review not found', 404);
  await prisma.report.create({
    data: {
      reporterId: userId,
      targetType: 'REVIEW',
      targetId: reviewId,
      reason,
    },
  });
}
