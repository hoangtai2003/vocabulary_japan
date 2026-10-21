import type { Paginated, TodayResponse, TopicsResponse, WordsQuery } from '@/types/api';
import type { WordWithState } from '@/types/word';
import { apiClient } from './client';

export const wordsApi = {
  today: (signal?: AbortSignal) => apiClient.get<TodayResponse>('/words/today', undefined, signal),

  list: (query: WordsQuery, signal?: AbortSignal) =>
    apiClient.get<Paginated<WordWithState>>(
      '/words',
      {
        level: query.level,
        topic: query.topic,
        q: query.q,
        favorite: query.favorite ? 'true' : undefined,
        status: query.status,
        page: query.page,
        page_size: query.page_size,
      },
      signal,
    ),

  detail: (id: string, signal?: AbortSignal) =>
    apiClient.get<WordWithState>(`/words/${encodeURIComponent(id)}`, undefined, signal),

  topics: (signal?: AbortSignal) => apiClient.get<TopicsResponse>('/topics', undefined, signal),

  setFavorite: (id: string, isFavorite: boolean) =>
    apiClient.put<WordWithState>(`/words/${encodeURIComponent(id)}/favorite`, {
      is_favorite: isFavorite,
    }),

  setNote: (id: string, note: string) =>
    apiClient.put<WordWithState>(`/words/${encodeURIComponent(id)}/note`, { note }),
};
