import { z } from 'zod';
import { listingFulfillmentSchema, usedConditionSchema } from '../catalog/schemas.js';

export const usedListingCreateSchema = z.object({
  bookId: z.string().min(1).optional(),
  isbn: z.string().min(10).max(20).optional(),
  title: z.string().min(2).max(300).optional(),
  titleBn: z.string().min(2).max(300).optional(),
  author: z.string().min(2).max(200).optional(),
  genreSlug: z.string().min(1).optional(),
  condition: usedConditionSchema,
  price: z.string().regex(/^\d+(\.\d{2})?$/),
  description: z.string().min(10).max(4000),
  district: z.string().min(2).max(80),
  area: z.string().min(1).max(80),
  fulfillment: listingFulfillmentSchema.default('SHIPPING'),
  photoKeys: z.array(z.string().min(1)).min(2).max(8),
});

export const usedNearMeQuerySchema = z.object({
  district: z.string().min(1).optional(),
  area: z.string().min(1).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

export const sellerRatingCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
});

export const isbnParamSchema = z.object({
  isbn: z
    .string()
    .min(10)
    .max(20)
    .transform((s) => s.replace(/[-\s]/g, '')),
});
