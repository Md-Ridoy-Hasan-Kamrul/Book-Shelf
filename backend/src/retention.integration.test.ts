import { toPaisa } from '@bookverse/shared';
import { describe, expect, it } from 'vitest';
import { loadApiEnv } from './env.js';
import { createLogger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { deliverNotification } from './services/retention/notificationDeliveryService.js';
const runDb = Boolean(process.env.DATABASE_URL) && process.env.HEALTH_SKIP_INFRA !== 'true';

describe.runIf(runDb)('P10 retention', () => {
  const env = loadApiEnv({ NODE_ENV: 'test', HEALTH_SKIP_INFRA: 'false' });
  const logger = createLogger(env);

  it('isVerifiedBuyer cannot be forged via API schema path', async () => {
    const { createReview } = await import('./services/retention/reviewService.js');
    const user = await prisma.user.findFirst({ where: { role: 'USER' } });
    const book = await prisma.book.findFirst();
    expect(user && book).toBeTruthy();
    const review = await createReview(user!.id, book!.id, {
      rating: 5,
      body: 'A'.repeat(25),
      hasSpoiler: false,
      images: [],
    });
    expect(review.isVerifiedBuyer).toBe(false);
  });

  it('wishlist price drop delivers once in-app and once email', async () => {
    const { enqueueWishlistAlertsForListingChange } =
      await import('./services/retention/wishlistAlertService.js');
    const buyer = await prisma.user.findFirst({ where: { role: 'USER' } });
    const listing = await prisma.listing.findFirst({
      where: { status: 'ACTIVE' },
      include: { book: true },
    });
    expect(buyer && listing).toBeTruthy();

    await prisma.notificationPreference.upsert({
      where: { userId_channel: { userId: buyer!.id, channel: 'IN_APP' } },
      create: { userId: buyer!.id, channel: 'IN_APP', enabled: true },
      update: { enabled: true },
    });
    await prisma.notificationPreference.upsert({
      where: { userId_channel: { userId: buyer!.id, channel: 'EMAIL' } },
      create: { userId: buyer!.id, channel: 'EMAIL', enabled: true },
      update: { enabled: true },
    });

    const oldPrice = listing!.price.toString();
    await prisma.wishlistItem.upsert({
      where: { userId_bookId: { userId: buyer!.id, bookId: listing!.bookId } },
      create: { userId: buyer!.id, bookId: listing!.bookId, priceAtAdd: oldPrice },
      update: { priceAtAdd: oldPrice },
    });

    const newPrice = (Number(oldPrice) - 20).toFixed(2);
    const before = {
      price: oldPrice,
      stock: listing!.stock,
      bookId: listing!.bookId,
      bookTitle: listing!.book.title,
    };
    const after = { ...before, price: newPrice };

    await enqueueWishlistAlertsForListingChange(env, listing!.id, before, after);

    const dedupeKey = `wishlist:price:${listing!.id}:${toPaisa(newPrice)}:${buyer!.id}`;
    const payload = {
      userId: buyer!.id,
      dedupeKey,
      title: 'Wishlist price drop',
      body: 'test',
      emailSubject: 'Price drop',
      emailText: 'Price drop text',
    };

    await deliverNotification(env, logger, payload);
    await deliverNotification(env, logger, payload);

    const inApp = await prisma.notification.count({
      where: { userId: buyer!.id, channel: 'IN_APP', dedupeKey: payload.dedupeKey },
    });
    const email = await prisma.notification.count({
      where: { userId: buyer!.id, channel: 'EMAIL', dedupeKey: `${payload.dedupeKey}:email` },
    });
    expect(inApp).toBe(1);
    expect(email).toBe(1);
  });
});
