import type { AdminWordsQuery, Paginated } from '@/types/api';
import type { Word, WordInput } from '@/types/word';
import { apiClient } from './client';

export const adminApi = {
  listWords: (query: AdminWordsQuery, signal?: AbortSignal) =>
    apiClient.get<Paginated<Word>>(
      '/admin/words',
      {
        q: query.q,
        level: query.level,
        topic: query.topic,
        page: query.page,
        page_size: query.page_size,
        sort: query.sort,
        order: query.order,
      },
      signal,
    ),

  createWord: (body: WordInput) => apiClient.post<Word>('/admin/words', body),

  updateWord: (id: string, body: WordInput) =>
    apiClient.put<Word>(`/admin/words/${encodeURIComponent(id)}`, body),

  deleteWord: (id: string) => apiClient.delete<void>(`/admin/words/${encodeURIComponent(id)}`),
};
