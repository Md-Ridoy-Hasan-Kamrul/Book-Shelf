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

export async function fetchDiscoverConfig() {
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
  return apiFetch('/discover/recommend', recommendResultSchema);
}

export async function logMood(mood: MoodEnum, source: 'chip' | 'llm' | 'fallback' = 'chip') {
  return apiFetch('/discover/mood/log', z.object({ id: z.string(), mood: moodEnumSchema }), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mood, consent: true, source }),
  });
}

export async function classifyMoodText(text: string) {
  return apiFetch('/discover/mood/classify', moodClassifyResultSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}
