import { z } from 'zod';

export const writerProfileUpdateSchema = z.object({
  penName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(4000).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
});

export const betaProgramCreateSchema = z.object({
  bookId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  deadline: z.string().datetime(),
  requiredReviews: z.coerce.number().int().min(1).max(10).default(1),
  rewardPoints: z.coerce.number().int().min(1).max(5000).default(50),
  minEligibilityScore: z.coerce.number().int().min(0).max(1000).default(30),
  inviteUserIds: z.array(z.string().min(1)).min(1).max(50),
});

export const betaInviteRespondSchema = z.object({
  accept: z.boolean(),
});

export const liveEventCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).optional(),
  startsAt: z.string().datetime(),
  externalLiveUrl: z.string().url().max(2000).optional(),
  pinnedBookId: z.string().min(1).optional(),
});

export const liveEventUpdateSchema = z.object({
  status: z.enum(['SCHEDULED', 'LIVE', 'ENDED']).optional(),
  externalLiveUrl: z.string().url().max(2000).nullable().optional(),
  pinnedBookId: z.string().min(1).nullable().optional(),
});

export const liveQuestionCreateSchema = z.object({
  body: z.string().trim().min(3).max(500),
});

export const liveBanBodySchema = z.object({
  userId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const eligibilityBreakdownSchema = z.object({
  score: z.number().int(),
  verifiedPurchases: z.number().int(),
  helpfulVotes: z.number().int(),
  badgeCount: z.number().int(),
  abuseScore: z.number().int(),
  factors: z.object({
    purchasePts: z.number(),
    helpfulPts: z.number(),
    badgePts: z.number(),
    abusePenalty: z.number(),
  }),
});

export const quoteCardPayloadSchema = z.object({
  quote: z.string().trim().min(1).max(280),
  title: z.string().min(1).max(200),
  author: z.string().min(1).max(120),
  format: z.enum(['story', 'square']).default('square'),
});
