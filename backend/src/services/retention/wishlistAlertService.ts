import type { ApiEnv } from '@bookverse/shared';
import { toPaisa } from '@bookverse/shared';
import { prisma } from '../../lib/prisma.js';

type ListingSnapshot = { price: string; stock: number; bookId: string; bookTitle: string };

export async function enqueueWishlistAlertsForListingChange(
  env: ApiEnv,
  listingId: string,
  before: ListingSnapshot,
  after: ListingSnapshot,
): Promise<void> {
  const beforePaisa = toPaisa(before.price);
  const afterPaisa = toPaisa(after.price);
  const priceDropped = afterPaisa < beforePaisa;
  const backInStock = before.stock === 0 && after.stock > 0;

  if (!priceDropped && !backInStock) return;

  const { enqueueNotification } = await import('../../jobs/notificationQueue.js');
  const wishlist = await prisma.wishlistItem.findMany({ where: { bookId: after.bookId } });

  for (const item of wishlist) {
    if (priceDropped && afterPaisa < toPaisa(item.priceAtAdd.toString())) {
      const dedupeKey = `wishlist:price:${listingId}:${afterPaisa}:${item.userId}`;
      await enqueueNotification(env, {
        userId: item.userId,
        dedupeKey,
        title: 'Wishlist price drop',
        body: `${after.bookTitle} is now ৳${after.price} (was ৳${before.price} when you saved it).`,
        emailSubject: `Price drop: ${after.bookTitle}`,
        emailText: `${after.bookTitle} is now ৳${after.price} on BookVerse.`,
      });
    }
    if (backInStock) {
      const dedupeKey = `wishlist:stock:${listingId}:${item.userId}`;
      await enqueueNotification(env, {
        userId: item.userId,
        dedupeKey,
        title: 'Back in stock',
        body: `${after.bookTitle} is available again on BookVerse.`,
        emailSubject: `Back in stock: ${after.bookTitle}`,
        emailText: `${after.bookTitle} is back in stock on BookVerse.`,
      });
    }
  }
}
