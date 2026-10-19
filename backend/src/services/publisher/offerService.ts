import { fromPaisa, toPaisa } from '@bookverse/shared';
import type { z } from 'zod';
import type { offerCreateSchema } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';

type OfferInput = z.infer<typeof offerCreateSchema>;

export async function createOffer(ownerId: string, role: string, input: OfferInput) {
  if (role !== 'PUBLISHER' && role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Publisher role required', 403);
  }
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (endsAt <= startsAt) {
    throw new AppError('VALIDATION_ERROR', 'endsAt must be after startsAt', 400);
  }

  if (input.kind === 'FLASH') {
    const listing = await prisma.listing.findFirst({
      where: { id: input.listingId, sellerId: ownerId },
    });
    if (!listing && role !== 'ADMIN') {
      throw new AppError('FORBIDDEN', 'You do not own this listing', 403);
    }
    return prisma.offer.create({
      data: {
        ownerId,
        kind: 'FLASH',
        listingId: input.listingId,
        flashPrice: input.flashPrice,
        startsAt,
        endsAt,
      },
    });
  }

  return prisma.offer.create({
    data: {
      ownerId,
      kind: 'BUNDLE',
      bundleListingIds: input.bundleListingIds,
      buyQty: input.buyQty,
      freeQty: input.freeQty,
      startsAt,
      endsAt,
    },
  });
}

type QuoteLine = {
  listingId: string;
  unitPrice: string;
  qty: number;
  lineTotalPaisa: bigint;
};

/** Server-side flash + bundle discounts. Client prices are never trusted. */
export async function applyOffersToLines(lines: QuoteLine[]): Promise<{
  lines: QuoteLine[];
  offerDiscountPaisa: bigint;
  appliedOffers: string[];
}> {
  const now = new Date();
  const listingIds = lines.map((l) => l.listingId);
  const offers = await prisma.offer.findMany({
    where: {
      active: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
      OR: [{ kind: 'FLASH', listingId: { in: listingIds } }, { kind: 'BUNDLE' }],
    },
  });

  const appliedOffers: string[] = [];
  let offerDiscountPaisa = 0n;
  const next = lines.map((l) => ({ ...l }));

  for (const offer of offers) {
    if (offer.kind === 'FLASH' && offer.listingId && offer.flashPrice) {
      const line = next.find((l) => l.listingId === offer.listingId);
      if (!line) continue;
      const flash = toPaisa(offer.flashPrice.toString());
      const list = toPaisa(line.unitPrice);
      if (flash >= list) continue;
      const savings = (list - flash) * BigInt(line.qty);
      line.unitPrice = offer.flashPrice.toString();
      line.lineTotalPaisa = flash * BigInt(line.qty);
      offerDiscountPaisa += savings;
      appliedOffers.push(`FLASH:${offer.id}`);
    }
  }

  for (const offer of offers) {
    if (offer.kind !== 'BUNDLE' || !offer.buyQty || !offer.freeQty) continue;
    const bundleSet = new Set(offer.bundleListingIds);
    if (bundleSet.size === 0) continue;
    const matching = next.filter((l) => bundleSet.has(l.listingId));
    if (matching.length === 0) continue;
    const totalQty = matching.reduce((s, l) => s + l.qty, 0);
    const groupSize = offer.buyQty + offer.freeQty;
    const freeUnits = Math.floor(totalQty / groupSize) * offer.freeQty;
    if (freeUnits <= 0) continue;

    // Cheapest units are free (buy 2 get 1)
    const unitPrices: bigint[] = [];
    for (const l of matching) {
      for (let i = 0; i < l.qty; i++) unitPrices.push(toPaisa(l.unitPrice));
    }
    unitPrices.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    let freeLeft = freeUnits;
    let savings = 0n;
    for (const p of unitPrices) {
      if (freeLeft <= 0) break;
      savings += p;
      freeLeft -= 1;
    }
    if (savings <= 0n) continue;
    offerDiscountPaisa += savings;
    // Reduce line totals proportionally from cheapest listings
    let remaining = savings;
    const sortedLines = [...matching].sort((a, b) =>
      Number(toPaisa(a.unitPrice) - toPaisa(b.unitPrice)),
    );
    for (const l of sortedLines) {
      if (remaining <= 0n) break;
      const cut = remaining < l.lineTotalPaisa ? remaining : l.lineTotalPaisa;
      l.lineTotalPaisa -= cut;
      remaining -= cut;
    }
    appliedOffers.push(`BUNDLE:${offer.id}:${fromPaisa(savings)}`);
  }

  return { lines: next, offerDiscountPaisa, appliedOffers };
}
