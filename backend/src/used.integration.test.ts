import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from './lib/prisma.js';
import { loadApiEnv } from './env.js';
import { createUsedListing } from './services/used/usedListingService.js';
import { resolveCommissionBps } from './services/checkout/commissionService.js';
import { toPaisa, splitCommission } from '@bookverse/shared';

const runDb = Boolean(process.env.DATABASE_URL) && process.env.HEALTH_SKIP_INFRA !== 'true';

describe.runIf(runDb)('used-book marketplace (P13)', () => {
  const env = loadApiEnv({
    ...process.env,
    NODE_ENV: 'test',
    FEATURE_USED_BOOKS: 'true',
    HEALTH_SKIP_INFRA: 'false',
  });

  it('used listing stock is 1 and commission is 10% (USER)', async () => {
    const bps = await resolveCommissionBps('USER', 'fiction');
    expect(bps).toBe(1000);
    const { sellerPaisa, commissionPaisa } = splitCommission(toPaisa('500.00'), bps);
    expect(commissionPaisa + sellerPaisa).toBe(toPaisa('500.00'));
    expect(Number(commissionPaisa)).toBe(Number(toPaisa('50.00')));
  });

  it('first used listing enters moderation; stock fixed at 1', async () => {
    const user = await prisma.user.findFirst({
      where: { role: 'USER', emailVerified: true },
    });
    expect(user).toBeTruthy();
    const book = await prisma.book.findFirst();
    expect(book).toBeTruthy();

    await prisma.listing.deleteMany({ where: { sellerId: user!.id, isUsed: true } });

    const result = await createUsedListing(
      {
        id: user!.id,
        name: user!.name,
        email: user!.email,
        emailVerified: true,
        image: null,
        role: 'USER',
        phone: null,
        phoneVerified: false,
        displayName: null,
      },
      env,
      {
        bookId: book!.id,
        condition: 'GOOD',
        price: '199.00',
        description: 'Clean copy, lightly used pages, no marks.',
        district: 'Dhaka',
        area: `TestArea-${randomUUID().slice(0, 6)}`,
        fulfillment: 'SHIPPING',
        photoKeys: ['used/a.webp', 'used/b.webp'],
      },
    );

    expect(result.needsModeration).toBe(true);
    expect(result.status).toBe('PENDING_MODERATION');
    const row = await prisma.listing.findUniqueOrThrow({ where: { id: result.id } });
    expect(row.stock).toBe(1);
    expect(row.isUsed).toBe(true);
    expect(row.sellerType).toBe('USER');
  });
});
