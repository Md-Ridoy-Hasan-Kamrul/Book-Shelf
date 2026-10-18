import { llmMoodClassifyResultSchema, type MoodEnum } from '@bookverse/shared';
import type { LlmProvider } from './types.js';

const KEYWORDS: Array<{ mood: MoodEnum; words: string[] }> = [
  { mood: 'happy', words: ['happy', 'joy', 'fun', 'খুশি', 'আনন্দ'] },
  { mood: 'calm', words: ['calm', 'peace', 'relax', 'শান্ত', 'বিশ্রাম'] },
  { mood: 'sad', words: ['sad', 'cry', 'lonely night', 'দুঃখ', 'কান্না'] },
  { mood: 'motivated', words: ['motivate', 'ambition', 'হাল ছাড়ব', 'উদ্যম'] },
  { mood: 'curious', words: ['curious', 'wonder', 'why', 'কৌতূহল', 'জিজ্ঞাসা'] },
  { mood: 'romantic', words: ['love', 'romance', 'ভালবাসা', 'প্রেম'] },
  { mood: 'lonely', words: ['alone', 'lonely', 'একাকী', 'নিঃসঙ্গ'] },
  { mood: 'stressed', words: ['stress', 'anxious', 'চাপ', 'উদ্বেগ'] },
  { mood: 'adventurous', words: ['adventure', 'adventurous', 'travel', 'অভিযান', 'ভ্রমণ'] },
  { mood: 'focused', words: ['focus', 'study', 'deep work', 'মনোযোগ', 'পড়াশোনা'] },
];

/** Local mock — keyword classify only; never invents books. */
export function createMockLlmProvider(): LlmProvider {
  return {
    kind: 'mock',
    async classifyMood({ text, model }) {
      const lower = text.toLowerCase();
      for (const row of KEYWORDS) {
        if (row.words.some((w) => lower.includes(w.toLowerCase()))) {
          const parsed = llmMoodClassifyResultSchema.parse({ mood: row.mood });
          return { mood: parsed.mood, model };
        }
      }
      return null;
    },
  };
}
