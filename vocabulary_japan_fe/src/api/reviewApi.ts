import type { DueReviewsResponse, GradeResponse, Quality } from '@/types/api';
import { apiClient } from './client';

export const DEFAULT_DUE_LIMIT = 50;

export const reviewApi = {
  due: (limit: number = DEFAULT_DUE_LIMIT, signal?: AbortSignal) =>
    apiClient.get<DueReviewsResponse>('/reviews/due', { limit }, signal),

  grade: (wordId: string, quality: Quality) =>
    apiClient.post<GradeResponse>(`/reviews/${encodeURIComponent(wordId)}`, { quality }),
};
