import { z } from 'zod';

export const listingConditionSchema = z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'READABLE']);
export const usedConditionSchema = z.enum(['LIKE_NEW', 'GOOD', 'FAIR', 'READABLE']);
export const listingFulfillmentSchema = z.enum(['SHIPPING', 'PICKUP', 'BOTH']);
export const catalogTypeSchema = z.enum(['NEW', 'USED']);
export const bookSortSchema = z.enum(['newest', 'price_asc', 'price_desc', 'title']);

export const booksListQuerySchema = z.object({
  genre: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  publisher: z.string().min(1).optional(),
  language: z.enum(['bn', 'en']).optional(),
  condition: listingConditionSchema.optional(),
  type: catalogTypeSchema.optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sort: bookSortSchema.default('newest'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

export const searchQuerySchema = z.object({
  q: z
    .string()
    .max(200)
    .transform((s) => s.trim()),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  cursor: z.string().optional(),
});

export const searchSuggestQuerySchema = z.object({
  q: z.string().min(1).max(100),
});

export const bookCardSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  titleBn: z.string(),
  author: z.string(),
  coverUrl: z.string().nullable(),
  minPrice: z.string().nullable(),
  hasStock: z.boolean(),
  language: z.string(),
  genreSlug: z.string(),
});

export const bookListingSchema = z.object({
  id: z.string(),
  price: z.string(),
  stock: z.number(),
  condition: listingConditionSchema,
  sellerType: z.string(),
  sellerName: z.string(),
});

export const bookDetailSchema = bookCardSchema.extend({
  description: z.string(),
  descriptionBn: z.string().nullable(),
  authorBn: z.string().nullable(),
  isbn: z.string().nullable(),
  pageCount: z.number().nullable(),
  publishedYear: z.number().nullable(),
  moodTags: z.array(z.string()),
  genreId: z.string().optional(),
  genreName: z.string(),
  genreNameBn: z.string(),
  publisherSlug: z.string().nullable(),
  publisherName: z.string().nullable(),
  writerPenName: z.string().nullable(),
  listings: z.array(bookListingSchema),
  lookInsidePages: z.array(z.string()).optional(),
  release: z
    .object({
      releaseAt: z.string(),
      preorderEnabled: z.boolean(),
      serverNow: z.string(),
      msUntilRelease: z.number().int(),
    })
    .nullable()
    .optional(),
  outOfStock: z.boolean().optional(),
});

export const searchSuggestSchema = z.object({
  books: z.array(z.object({ slug: z.string(), title: z.string(), author: z.string() })),
  authors: z.array(z.object({ name: z.string(), count: z.number() })),
  publishers: z.array(z.object({ slug: z.string(), name: z.string() })),
});

export const createBookListingSchema = z.object({
  title: z.string().min(2).max(300),
  titleBn: z.string().min(2).max(300),
  author: z.string().min(2).max(200),
  authorBn: z.string().max(200).optional(),
  description: z.string().min(20).max(8000),
  descriptionBn: z.string().max(8000).optional(),
  genreSlug: z.string().min(1),
  language: z.enum(['bn', 'en']).default('bn'),
  isbn: z.string().max(20).optional(),
  pageCount: z.coerce.number().int().positive().optional(),
  publishedYear: z.coerce.number().int().min(1800).max(2100).optional(),
  moodTags: z.array(z.string()).max(5).default([]),
  price: z.string().regex(/^\d+(\.\d{2})?$/),
  stock: z.coerce.number().int().nonnegative().default(0),
  condition: listingConditionSchema.default('NEW'),
});

export const updateListingStockSchema = z.object({
  stock: z.coerce.number().int().nonnegative(),
});

export const listingUpdateSchema = z.object({
  stock: z.coerce.number().int().nonnegative().optional(),
  price: z
    .string()
    .regex(/^\d+(\.\d{2})?$/)
    .optional(),
});

export const lookInsideSubmitSchema = z.object({
  copyrightConfirmed: z.literal(true),
});
