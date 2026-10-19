import { fromPaisa, toPaisa, type ApiEnv } from '@bookverse/shared';
import type { z } from 'zod';
import type { campaignCreateSchema, campaignEventKindSchema } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { mintTrackingId, verifyTrackingId } from './trackingId.js';

type CreateInput = z.infer<typeof campaignCreateSchema>;
type EventKind = z.infer<typeof campaignEventKindSchema>;

async function assertPublisherOwner(userId: string, role: string) {
  if (role !== 'PUBLISHER' && role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Publisher role required', 403);
  }
  const profile = await prisma.publisherProfile.findUnique({ where: { userId } });
  if (!profile && role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Publisher profile required', 403);
  }
  return profile;
}

export async function createCampaign(userId: string, role: string, input: CreateInput) {
  await assertPublisherOwner(userId, role);
  if (input.followersOnly === false && input.targetGenreIds.length === 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Target by genre and/or follower relationship only (no invasive profiling)',
      400,
    );
  }
  return prisma.campaign.create({
    data: {
      ownerId: userId,
      name: input.name,
      budget: input.budget,
      costBdt: input.costBdt,
      targetGenreIds: input.targetGenreIds,
      followersOnly: input.followersOnly,
      bookId: input.bookId,
      listingId: input.listingId,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      status: 'ACTIVE',
    },
  });
}

export async function listOwnedCampaigns(userId: string) {
  return prisma.campaign.findMany({
    where: { ownerId: userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      name: true,
      status: true,
      costBdt: true,
      budget: true,
      targetGenreIds: true,
      followersOnly: true,
      invoiceStatus: true,
      createdAt: true,
    },
  });
}

/** Eligible sponsored placements — genre + follower only. */
export async function getEligibleSponsored(env: ApiEnv, viewerId: string | null, genreId?: string) {
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: 'ACTIVE',
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
      ...(genreId
        ? {
            OR: [{ targetGenreIds: { equals: [] } }, { targetGenreIds: { has: genreId } }],
          }
        : {}),
    },
    take: 20,
    include: {
      book: { select: { id: true, slug: true, title: true, titleBn: true, genreId: true } },
      listing: { select: { id: true, price: true, stock: true, status: true } },
      owner: { select: { id: true } },
    },
  });

  const out: Array<{
    campaignId: string;
    name: string;
    bookId: string | null;
    listingId: string | null;
    trackingId: string;
  }> = [];

  for (const c of campaigns) {
    if (c.followersOnly) {
      if (!viewerId) continue;
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: viewerId, followingId: c.ownerId },
        },
      });
      if (!follow) continue;
    }
    if (genreId && c.targetGenreIds.length > 0 && !c.targetGenreIds.includes(genreId)) {
      continue;
    }
    if (c.listing && (c.listing.status !== 'ACTIVE' || c.listing.stock <= 0)) continue;
    const listingId = c.listingId ?? 'none';
    const bookId = c.bookId ?? 'none';
    out.push({
      campaignId: c.id,
      name: c.name,
      bookId: c.bookId,
      listingId: c.listingId,
      trackingId: mintTrackingId(env, { campaignId: c.id, listingId, bookId }),
    });
  }
  return out;
}

export async function trackCampaignEvent(
  env: ApiEnv,
  userId: string | null,
  trackingId: string,
  kind: EventKind,
  extras?: { amountBdt?: string; orderId?: string },
) {
  const payload = verifyTrackingId(env, trackingId);
  if (!payload) {
    throw new AppError('VALIDATION_ERROR', 'Invalid or expired tracking id', 400);
  }
  const campaign = await prisma.campaign.findUnique({ where: { id: payload.campaignId } });
  if (!campaign || campaign.status !== 'ACTIVE') {
    throw new AppError('NOT_FOUND', 'Campaign not found', 404);
  }

  try {
    return await prisma.campaignEvent.create({
      data: {
        campaignId: campaign.id,
        kind,
        trackingId,
        userId: userId ?? undefined,
        listingId: payload.listingId === 'none' ? null : payload.listingId,
        bookId: payload.bookId === 'none' ? null : payload.bookId,
        orderId: extras?.orderId,
        amountBdt: extras?.amountBdt,
      },
      select: { id: true, kind: true, campaignId: true },
    });
  } catch {
    return { id: 'duplicate', kind, campaignId: campaign.id };
  }
}

export async function getCampaignMetrics(userId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, ownerId: userId },
  });
  if (!campaign) throw new AppError('NOT_FOUND', 'Campaign not found', 404);

  const groups = await prisma.campaignEvent.groupBy({
    by: ['kind'],
    where: { campaignId },
    _count: { _all: true },
    _sum: { amountBdt: true },
  });

  const count = (k: EventKind) => groups.find((g) => g.kind === k)?._count._all ?? 0;
  const impressions = count('IMPRESSION');
  const clicks = count('CLICK');
  const addToCarts = count('ADD_TO_CART');
  const purchases = count('PURCHASE');
  const purchaseSum = groups.find((g) => g.kind === 'PURCHASE')?._sum.amountBdt;
  const revenuePaisa = purchaseSum ? toPaisa(purchaseSum.toString()) : 0n;
  const costPaisa = toPaisa(campaign.costBdt.toString());
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const conversion = clicks > 0 ? purchases / clicks : 0;
  const roas = costPaisa > 0n ? Number(revenuePaisa) / Number(costPaisa) : 0;

  return {
    campaignId: campaign.id,
    name: campaign.name,
    impressions,
    clicks,
    addToCarts,
    purchases,
    ctr: Number(ctr.toFixed(4)),
    conversion: Number(conversion.toFixed(4)),
    revenue: fromPaisa(revenuePaisa),
    cost: campaign.costBdt.toString(),
    roas: Number(roas.toFixed(4)),
    invoiceStatus: campaign.invoiceStatus,
  };
}

export async function createManualInvoice(
  userId: string,
  campaignId: string,
  amountBdt: string,
  note?: string,
) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, ownerId: userId },
  });
  if (!campaign) throw new AppError('NOT_FOUND', 'Campaign not found', 404);

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.campaignInvoice.create({
      data: {
        campaignId,
        ownerId: userId,
        amountBdt,
        status: 'DRAFT',
        note,
      },
    });
    await tx.campaign.update({
      where: { id: campaignId },
      data: { invoiceStatus: 'DRAFT', costBdt: amountBdt },
    });
    return inv;
  });
  return invoice;
}

export async function attributePurchases(
  env: ApiEnv,
  userId: string,
  trackingIds: string[],
  orderId: string,
  amountBdt: string,
) {
  for (const trackingId of trackingIds) {
    await trackCampaignEvent(env, userId, trackingId, 'PURCHASE', { amountBdt, orderId });
  }
}
