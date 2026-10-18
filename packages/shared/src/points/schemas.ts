import { z } from 'zod';

export const bookshelfStatusSchema = z.enum([
  'WANT_TO_READ',
  'CURRENTLY_READING',
  'READ',
  'PAUSED',
]);

export const bookshelfUpsertSchema = z.object({
  bookId: z.string().min(1),
  status: bookshelfStatusSchema,
  pageProgress: z.coerce.number().int().min(0).optional(),
  shareAsPost: z.boolean().optional(),
});

export const readingGoalUpdateSchema = z.object({
  targetBooks: z.coerce.number().int().min(1).max(500),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const pointHistoryQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});
