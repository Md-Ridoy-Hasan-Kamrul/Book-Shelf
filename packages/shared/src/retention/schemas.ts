import { z } from 'zod';

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().min(1).max(8000),
  hasSpoiler: z.boolean().default(false),
  images: z.array(z.string()).max(4).default([]),
});

export const reviewListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const reportCreateSchema = z.object({
  reason: z.string().min(1).max(500),
});
