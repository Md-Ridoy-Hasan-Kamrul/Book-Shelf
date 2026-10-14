import type { z } from 'zod';
import type { bookCardSchema, searchSuggestSchema } from '@bookverse/shared';

export type BookCard = z.infer<typeof bookCardSchema>;
export type SearchSuggest = z.infer<typeof searchSuggestSchema>;

export type SearchParams = {
  q: string;
  limit: number;
  cursor?: string;
};

export type SearchResult = {
  items: BookCard[];
  nextCursor: string | null;
};

export interface SearchService {
  search(params: SearchParams): Promise<SearchResult>;
  suggest(q: string): Promise<SearchSuggest>;
}
