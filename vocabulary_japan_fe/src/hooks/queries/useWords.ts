import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { wordsApi } from '@/api/wordsApi';
import type { WordsQuery } from '@/types/api';

export const WORDS_PAGE_SIZE = 20;

export type WordFilters = Omit<WordsQuery, 'page' | 'page_size'>;

/** GET /words với cuộn vô hạn. Mỗi bộ lọc là một cache riêng. */
export function useInfiniteWords(filters: WordFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.words.list(filters),
    queryFn: ({ pageParam, signal }) =>
      wordsApi.list({ ...filters, page: pageParam, page_size: WORDS_PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
    placeholderData: keepPreviousData,
  });
}

/** GET /words/:id */
export function useWord(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.words.detail(id ?? ''),
    queryFn: ({ signal }) => wordsApi.detail(id ?? '', signal),
    enabled: Boolean(id),
  });
}

/** GET /topics — gần như không đổi, giữ cache cả phiên. */
export function useTopics() {
  return useQuery({
    queryKey: queryKeys.topics,
    queryFn: ({ signal }) => wordsApi.topics(signal),
    staleTime: Infinity,
  });
}
