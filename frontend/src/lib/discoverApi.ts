import {
  discoverConfigSchema,
  moodClassifyResultSchema,
  moodDiscoverResultSchema,
  moodEnumSchema,
  recommendResultSchema,
  type MoodEnum,
} from '@bookverse/shared';
import { z } from 'zod';
import { apiFetch } from './apiClient';
import { useMockData } from './mockMode';
import { mockDiscoverConfig, mockMoodBooks, mockRecommendations } from './mockCatalog';

export async function fetchDiscoverConfig() {
  if (useMockData()) return discoverConfigSchema.parse(mockDiscoverConfig());
  return apiFetch('/discover/config', discoverConfigSchema);
}

export async function fetchMoodBooks(params: {
  mood: MoodEnum;
  minPrice?: number;
  maxPrice?: number;
  minPages?: number;
  maxPages?: number;
  sort?: string;
  cursor?: string;
}) {
  if (useMockData()) return moodDiscoverResultSchema.parse(mockMoodBooks(params.mood));
  const q = new URLSearchParams();
  q.set('mood', params.mood);
  if (params.minPrice != null) q.set('minPrice', String(params.minPrice));
  if (params.maxPrice != null) q.set('maxPrice', String(params.maxPrice));
  if (params.minPages != null) q.set('minPages', String(params.minPages));
  if (params.maxPages != null) q.set('maxPages', String(params.maxPages));
  if (params.sort) q.set('sort', params.sort);
  if (params.cursor) q.set('cursor', params.cursor);
  return apiFetch(`/discover/mood?${q}`, moodDiscoverResultSchema);
}

export async function fetchRecommendations() {
  if (useMockData()) return recommendResultSchema.parse(mockRecommendations());
  return apiFetch('/discover/recommend', recommendResultSchema);
}

export async function logMood(mood: MoodEnum, source: 'chip' | 'llm' | 'fallback' = 'chip') {
  if (useMockData()) {
    return { id: `mock-mood-log-${mood}`, mood };
  }
  return apiFetch('/discover/mood/log', z.object({ id: z.string(), mood: moodEnumSchema }), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mood, consent: true, source }),
  });
}

export async function classifyMoodText(text: string) {
  if (useMockData()) {
    const lower = text.toLowerCase();
    const mood: MoodEnum = lower.includes('sad')
      ? 'sad'
      : lower.includes('happy')
        ? 'happy'
        : lower.includes('stress')
          ? 'stressed'
          : 'curious';
    return moodClassifyResultSchema.parse({ mood, source: 'fallback', model: 'mock-local' });
  }
  return apiFetch('/discover/mood/classify', moodClassifyResultSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}
