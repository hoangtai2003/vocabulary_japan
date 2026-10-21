import type {
  AdminWordsQuery,
  ImportFormat,
  ImportRequest,
  ImportResult,
  Paginated,
} from '@/types/api';
import type { Word, WordInput } from '@/types/word';
import { apiClient, type DownloadedFile } from './client';

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

  importWords: (body: ImportRequest) => apiClient.post<ImportResult>('/admin/words/import', body),

  exportWords: (format: ImportFormat): Promise<DownloadedFile> =>
    apiClient.download('/admin/words/export', { format }, `tu-vung.${format}`),
};
