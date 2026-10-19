import { z } from 'zod';

export const campaignEventKindSchema = z.enum(['IMPRESSION', 'CLICK', 'ADD_TO_CART', 'PURCHASE']);

export const campaignCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  budget: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  costBdt: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .default('0.00'),
  targetGenreIds: z.array(z.string().min(1)).max(20).default([]),
  followersOnly: z.boolean().default(false),
  bookId: z.string().min(1).optional(),
  listingId: z.string().min(1).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export const campaignTrackBodySchema = z.object({
  trackingId: z.string().min(16).max(512),
  kind: campaignEventKindSchema,
  amountBdt: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  orderId: z.string().min(1).optional(),
});

export const campaignMetricsSchema = z.object({
  campaignId: z.string(),
  name: z.string(),
  impressions: z.number().int(),
  clicks: z.number().int(),
  addToCarts: z.number().int(),
  purchases: z.number().int(),
  ctr: z.number(),
  conversion: z.number(),
  revenue: z.string(),
  cost: z.string(),
  roas: z.number(),
  invoiceStatus: z.string(),
});

export const campaignInvoiceCreateSchema = z.object({
  amountBdt: z.string().regex(/^\d+(\.\d{1,2})?$/),
  note: z.string().max(2000).optional(),
});

export const reprintRequestBodySchema = z.object({
  district: z.string().trim().min(2).max(80).optional(),
  note: z.string().trim().max(500).optional(),
});

export const reprintDemandQuerySchema = z.object({
  bookId: z.string().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const releaseUpsertSchema = z.object({
  bookId: z.string().min(1),
  releaseAt: z.string().datetime(),
  preorderEnabled: z.boolean().default(false),
});

export const offerCreateSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('FLASH'),
    listingId: z.string().min(1),
    flashPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  }),
  z.object({
    kind: z.literal('BUNDLE'),
    bundleListingIds: z.array(z.string().min(1)).min(1).max(10),
    buyQty: z.coerce.number().int().min(1).max(20),
    freeQty: z.coerce.number().int().min(1).max(10),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  }),
]);

export const featureReviewBodySchema = z.object({
  reviewId: z.string().min(1),
});

export const featurePostBodySchema = z.object({
  postId: z.string().min(1),
});

export const serverTimeSchema = z.object({
  serverNow: z.string().datetime(),
});

export const bookReleasePublicSchema = z.object({
  bookId: z.string(),
  releaseAt: z.string().datetime(),
  preorderEnabled: z.boolean(),
  serverNow: z.string().datetime(),
  msUntilRelease: z.number().int(),
});
