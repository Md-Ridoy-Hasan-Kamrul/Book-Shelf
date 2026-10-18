import type { MoodEnum } from '@bookverse/shared';

export const MOOD_LABELS: Record<MoodEnum, { label: string; labelBn: string }> = {
  happy: { label: 'Happy', labelBn: 'খুশি' },
  calm: { label: 'Calm', labelBn: 'শান্ত' },
  sad: { label: 'Sad', labelBn: 'দুঃখিত' },
  motivated: { label: 'Motivated', labelBn: 'উদ্যমী' },
  curious: { label: 'Curious', labelBn: 'কৌতূহলী' },
  romantic: { label: 'Romantic', labelBn: 'রোমান্টিক' },
  lonely: { label: 'Lonely', labelBn: 'একাকী' },
  stressed: { label: 'Stressed', labelBn: 'চাপগ্রস্ত' },
  adventurous: { label: 'Adventurous', labelBn: 'অ্যাডভেঞ্চার' },
  focused: { label: 'Focused', labelBn: 'মনোযোগী' },
};

export const DISCLAIMER = 'these books may match your mood' as const;

export const IN_STOCK_LISTING = {
  status: 'ACTIVE' as const,
  stock: { gt: 0 },
};
