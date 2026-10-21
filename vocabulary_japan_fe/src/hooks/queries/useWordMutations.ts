import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { wordsApi } from '@/api/wordsApi';
import type { WordWithState } from '@/types/word';
import {
  patchWordInCaches,
  restoreSnapshot,
  snapshotWordCaches,
  type CacheSnapshot,
} from './wordCache';

interface Context {
  snapshot: CacheSnapshot;
}

/** PUT /words/:id/favorite với optimistic update; lỗi thì hoàn tác. */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation<WordWithState, Error, { wordId: string; isFavorite: boolean }, Context>({
    mutationFn: ({ wordId, isFavorite }) => wordsApi.setFavorite(wordId, isFavorite),
    onMutate: async ({ wordId, isFavorite }) => {
      const snapshot = await snapshotWordCaches(queryClient);
      patchWordInCaches(queryClient, wordId, (w) => ({ ...w, is_favorite: isFavorite }));
      return { snapshot };
    },
    onError: (_error, _vars, context) => restoreSnapshot(queryClient, context?.snapshot),
    onSuccess: (word) => patchWordInCaches(queryClient, word.id, () => word),
    onSettled: () =>
      // Danh sách lọc "chỉ yêu thích" cần tải lại để thêm/bớt dòng.
      queryClient.invalidateQueries({
        queryKey: queryKeys.words.lists,
        predicate: (query) =>
          (query.queryKey[2] as { favorite?: boolean } | undefined)?.favorite === true,
      }),
  });
}

/** PUT /words/:id/note với optimistic update; lỗi thì hoàn tác. */
export function useSaveNote() {
  const queryClient = useQueryClient();
  return useMutation<WordWithState, Error, { wordId: string; note: string }, Context>({
    mutationFn: ({ wordId, note }) => wordsApi.setNote(wordId, note),
    onMutate: async ({ wordId, note }) => {
      const snapshot = await snapshotWordCaches(queryClient);
      patchWordInCaches(queryClient, wordId, (w) => ({ ...w, note }));
      return { snapshot };
    },
    onError: (_error, _vars, context) => restoreSnapshot(queryClient, context?.snapshot),
    onSuccess: (word) => patchWordInCaches(queryClient, word.id, () => word),
  });
}
