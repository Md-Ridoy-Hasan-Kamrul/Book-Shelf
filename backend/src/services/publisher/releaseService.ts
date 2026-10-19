import type { ApiEnv } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { enqueueNotification } from '../../jobs/notificationQueue.js';

export function serverNowIso() {
  return new Date().toISOString();
}

export async function upsertRelease(
  ownerId: string,
  role: string,
  input: { bookId: string; releaseAt: string; preorderEnabled: boolean },
) {
  if (role !== 'PUBLISHER' && role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Publisher role required', 403);
  }
  const profile = await prisma.publisherProfile.findUnique({ where: { userId: ownerId } });
  const book = await prisma.book.findUnique({ where: { id: input.bookId } });
  if (!book) throw new AppError('NOT_FOUND', 'Book not found', 404);
  if (role !== 'ADMIN' && book.publisherId !== profile?.id) {
    throw new AppError('FORBIDDEN', 'Not your book', 403);
  }

  return prisma.bookRelease.upsert({
    where: { bookId: input.bookId },
    create: {
      bookId: input.bookId,
      releaseAt: new Date(input.releaseAt),
      preorderEnabled: input.preorderEnabled,
    },
    update: {
      releaseAt: new Date(input.releaseAt),
      preorderEnabled: input.preorderEnabled,
    },
  });
}

export async function getReleasePublic(bookId: string) {
  const release = await prisma.bookRelease.findUnique({ where: { bookId } });
  if (!release) return null;
  const now = Date.now();
  const releaseMs = release.releaseAt.getTime();
  return {
    bookId,
    releaseAt: release.releaseAt.toISOString(),
    preorderEnabled: release.preorderEnabled,
    serverNow: new Date(now).toISOString(),
    msUntilRelease: Math.max(0, releaseMs - now),
  };
}

export async function notifyMe(env: ApiEnv, userId: string, bookId: string) {
  const release = await prisma.bookRelease.findUnique({ where: { bookId } });
  if (!release) throw new AppError('NOT_FOUND', 'No upcoming release for this book', 404);

  const row = await prisma.releaseNotify.upsert({
    where: { bookId_userId: { bookId, userId } },
    create: { bookId, userId },
    update: {},
  });

  await enqueueNotification(env, {
    userId,
    dedupeKey: `release-notify:${bookId}:${userId}`,
    title: 'Release reminder saved',
    body: 'We will notify you when this book is released.',
  }).catch(() => undefined);

  return row;
}
