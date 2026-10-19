import { z } from 'zod';

export const postTypeSchema = z.enum([
  'TEXT',
  'IMAGE',
  'REVIEW_SHARE',
  'READING_UPDATE',
  'QUOTE',
  'QUESTION',
  'ANNOUNCEMENT',
  'SPONSORED',
  'STATUS',
  'PHOTO',
  'POLL',
  'BLOG',
]);

export const postCreateSchema = z.object({
  type: postTypeSchema,
  body: z.string().min(1).max(8000),
  bookId: z.string().optional(),
  hasSpoiler: z.boolean().default(false),
  imageKeys: z.array(z.string()).max(4).default([]),
  campaignId: z.string().optional(),
  /** Follower-only content — visible only to followers of the author. */
  followersOnly: z.boolean().default(false),
});

export const postUpdateSchema = z.object({
  body: z.string().min(1).max(8000).optional(),
  hasSpoiler: z.boolean().optional(),
});

export const commentCreateSchema = z.object({
  body: z.string().min(1).max(2000),
  parentId: z.string().optional(),
  hasSpoiler: z.boolean().default(false),
});

export const reactionSchema = z.object({
  kind: z.enum(['LIKE', 'DISLIKE']),
});

export const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(30).default(15),
  mode: z.enum(['following', 'trending', 'mixed']).default('mixed'),
});

export const moderationActionSchema = z.object({
  action: z.enum(['HIDE', 'REMOVE', 'RESTORE', 'WARN', 'SUSPEND']),
  targetType: z.enum(['POST', 'COMMENT', 'USER']),
  targetId: z.string(),
  note: z.string().max(2000).optional(),
  suspendDays: z.number().int().min(1).max(90).optional(),
});
