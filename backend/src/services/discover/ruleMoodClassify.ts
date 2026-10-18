import { moodEnumSchema, type MoodEnum } from '@bookverse/shared';

const RULES: Array<{ mood: MoodEnum; words: string[] }> = [
  { mood: 'happy', words: ['happy', 'joy', 'fun', 'cheer', 'খুশি', 'আনন্দ', 'মজার'] },
  { mood: 'calm', words: ['calm', 'peace', 'relax', 'quiet', 'শান্ত', 'বিশ্রাম', 'নীরব'] },
  { mood: 'sad', words: ['sad', 'cry', 'grief', 'দুঃখ', 'কান্না', 'বেদনা'] },
  { mood: 'motivated', words: ['motivate', 'inspire', 'ambition', 'উদ্যম', 'অনুপ্রেরণা'] },
  { mood: 'curious', words: ['curious', 'wonder', 'mystery', 'কৌতূহল', 'রহস্য'] },
  { mood: 'romantic', words: ['love', 'romance', 'heart', 'ভালবাসা', 'প্রেম', 'রোমান্স'] },
  { mood: 'lonely', words: ['alone', 'lonely', 'একাকী', 'নিঃসঙ্গ'] },
  { mood: 'stressed', words: ['stress', 'anxious', 'overwhelm', 'চাপ', 'উদ্বেগ'] },
  {
    mood: 'adventurous',
    words: ['adventure', 'adventurous', 'travel', 'explore', 'অভিযান', 'ভ্রমণ'],
  },
  { mood: 'focused', words: ['focus', 'study', 'work', 'মনোযোগ', 'পড়াশোনা'] },
];

/** Rule-based fallback when LLM is off or fails. Defaults to curious. */
export function classifyMoodByRules(text: string): MoodEnum {
  const lower = text.toLowerCase();
  for (const row of RULES) {
    if (row.words.some((w) => lower.includes(w.toLowerCase()))) {
      return moodEnumSchema.parse(row.mood);
    }
  }
  return 'curious';
}
