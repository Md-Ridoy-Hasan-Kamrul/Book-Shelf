import type { MoodEnum } from '@bookverse/shared';

export type LlmClassifyMoodInput = {
  text: string;
  model: string;
};

export type LlmClassifyMoodOutput = {
  mood: MoodEnum;
  model: string;
};

export interface LlmProvider {
  readonly kind: 'off' | 'mock';
  classifyMood(input: LlmClassifyMoodInput): Promise<LlmClassifyMoodOutput | null>;
}
