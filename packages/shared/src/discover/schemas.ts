import { z } from 'zod';

export const moodEnumSchema = z.enum([
  'happy',
  'calm',
  'sad',
  'motivated',
  'curious',
  'romantic',
  'lonely',
  'stressed',
  'adventurous',
  'focused',
]);

export type MoodEnum = z.infer<typeof moodEnumSchema>;

export const moodSortSchema = z.enum(['popularity', 'newest', 'price_asc', 'price_desc']);

export const moodDiscoverQuerySchema = z.object({
  mood: moodEnumSchema,
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minPages: z.coerce.number().int().positive().optional(),
  maxPages: z.coerce.number().int().positive().optional(),
  sort: moodSortSchema.default('popularity'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

export const moodLogBodySchema = z.object({
  mood: moodEnumSchema,
  consent: z.literal(true),
  source: z.enum(['chip', 'llm', 'fallback']).default('chip'),
});

export const moodClassifyBodySchema = z.object({
  text: z.string().trim().min(3).max(500),
});

export const llmMoodClassifyResultSchema = z.object({
  mood: moodEnumSchema,
});

export const discoverBookCardSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  titleBn: z.string(),
  author: z.string(),
  coverUrl: z.string().nullable(),
  minPrice: z.string().nullable(),
  hasStock: z.literal(true),
  language: z.string(),
  genreSlug: z.string(),
  moodTags: z.array(z.string()),
  pageCount: z.number().nullable(),
  why: z.string().optional(),
});

export const moodDiscoverResultSchema = z.object({
  disclaimer: z.literal('these books may match your mood'),
  mood: moodEnumSchema,
  items: z.array(discoverBookCardSchema),
  nextCursor: z.string().nullable(),
});

export const recommendSectionSchema = z.object({
  key: z.enum(['forYou', 'becauseYouRead', 'trendingGenres', 'alsoFollow']),
  title: z.string(),
  items: z.array(discoverBookCardSchema),
});

export const recommendResultSchema = z.object({
  cached: z.boolean(),
  sections: z.array(recommendSectionSchema),
});

export const moodClassifyResultSchema = z.object({
  mood: moodEnumSchema,
  source: z.enum(['llm', 'fallback']),
  model: z.string().nullable(),
});

export const discoverConfigSchema = z.object({
  moods: z.array(
    z.object({
      id: moodEnumSchema,
      label: z.string(),
      labelBn: z.string(),
    }),
  ),
  featureMoodLlm: z.boolean(),
  disclaimer: z.literal('these books may match your mood'),
});
