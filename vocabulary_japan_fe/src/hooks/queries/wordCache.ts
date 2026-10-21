import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import type { DueReviewsResponse, Paginated, TodayResponse } from '@/types/api';
import type { WordWithState } from '@/types/word';

type WordUpdater = (word: WordWithState) => WordWithState;

const patchList = (items: WordWithState[], id: string, update: WordUpdater) =>
  items.map((w) => (w.id === id ? update(w) : w));

/**
 * Cập nhật một từ ở mọi nơi nó có trong cache: chi tiết, danh sách (cuộn vô hạn),
 * từ mới hôm nay và danh sách ôn. Dùng cho optimistic update và khi server trả từ mới.
 */
export function patchWordInCaches(
  queryClient: QueryClient,
  wordId: string,
  update: WordUpdater,
): void {
  queryClient.setQueryData<WordWithState>(queryKeys.words.detail(wordId), (old) =>
    old ? update(old) : old,
  );

  queryClient.setQueriesData<InfiniteData<Paginated<WordWithState>>>(
    { queryKey: queryKeys.words.lists },
    (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: patchList(page.items, wordId, update),
            })),
          }
        : old,
  );

  queryClient.setQueryData<TodayResponse>(queryKeys.words.today, (old) =>
    old ? { ...old, new_words: patchList(old.new_words, wordId, update) } : old,
  );

  queryClient.setQueriesData<DueReviewsResponse>({ queryKey: queryKeys.reviews.due }, (old) =>
    old ? { ...old, items: patchList(old.items, wordId, update) } : old,
  );
}

export type CacheSnapshot = [QueryKey, unknown][];

/** Chụp lại các cache có thể bị patchWordInCaches thay đổi, để hoàn tác khi lỗi. */
export async function snapshotWordCaches(queryClient: QueryClient): Promise<CacheSnapshot> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: queryKeys.words.all }),
    queryClient.cancelQueries({ queryKey: queryKeys.reviews.due }),
  ]);
  return [
    ...queryClient.getQueriesData({ queryKey: queryKeys.words.all }),
    ...queryClient.getQueriesData({ queryKey: queryKeys.reviews.due }),
  ];
}

export function restoreSnapshot(
  queryClient: QueryClient,
  snapshot: CacheSnapshot | undefined,
): void {
  snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
}
