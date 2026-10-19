import type { ApiEnv } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { enqueueNotification } from '../../jobs/notificationQueue.js';

export async function featureReview(
  env: ApiEnv,
  publisherId: string,
  role: string,
  reviewId: string,
) {
  if (role !== 'PUBLISHER' && role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Publisher role required', 403);
  }
  const profile = await prisma.publisherProfile.findUnique({ where: { userId: publisherId } });
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { book: { select: { publisherId: true, title: true } } },
  });
  if (!review) throw new AppError('NOT_FOUND', 'Review not found', 404);
  if (role !== 'ADMIN' && review.book.publisherId !== profile?.id) {
    throw new AppError('FORBIDDEN', 'Not your book review', 403);
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { featuredAt: new Date(), featuredById: publisherId },
  });

  await enqueueNotification(env, {
    userId: review.userId,
    dedupeKey: `featured-review:${reviewId}`,
    title: 'Your review was featured',
    body: `A publisher featured your review of “${review.book.title}”.`,
    emailSubject: 'Your review was featured on BookVerse',
    emailText: `Your review of ${review.book.title} was featured by the publisher.`,
  }).catch(() => undefined);

  return updated;
}

export async function featurePost(env: ApiEnv, publisherId: string, role: string, postId: string) {
  if (role !== 'PUBLISHER' && role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Publisher role required', 403);
  }
  const profile = await prisma.publisherProfile.findUnique({ where: { userId: publisherId } });
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { book: { select: { publisherId: true, title: true } } },
  });
  if (!post || post.deletedAt) throw new AppError('NOT_FOUND', 'Post not found', 404);
  if (!post.bookId || !post.book) {
    throw new AppError('VALIDATION_ERROR', 'Only posts linked to a book can be featured', 400);
  }
  if (role !== 'ADMIN' && post.book.publisherId !== profile?.id) {
    throw new AppError('FORBIDDEN', 'Not your book post', 403);
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { featuredAt: new Date(), featuredById: publisherId },
  });

  await enqueueNotification(env, {
    userId: post.authorId,
    dedupeKey: `featured-post:${postId}`,
    title: 'Your post was featured',
    body: `A publisher featured your post about “${post.book.title}”.`,
    emailSubject: 'Your post was featured on BookVerse',
    emailText: `Your post about ${post.book.title} was featured by the publisher.`,
  }).catch(() => undefined);

  return updated;
}
