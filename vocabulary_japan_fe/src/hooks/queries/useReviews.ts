import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { DEFAULT_DUE_LIMIT, reviewApi } from '@/api/reviewApi';
import type { GradeResponse, Quality } from '@/types/api';
import { patchWordInCaches } from './wordCache';

/** GET /reviews/due */
export function useDueReviews(limit: number = DEFAULT_DUE_LIMIT) {
  return useQuery({
    queryKey: queryKeys.reviews.dueWithLimit(limit),
    queryFn: ({ signal }) => reviewApi.due(limit, signal),
  });
}

/**
 * POST /reviews/:wordId. Thành công thì cập nhật từ trong cache rồi invalidate
 * reviews.due, words.today và stats.* (mục 4.2).
 * Lưu ý: phiên học phải tự giữ hàng đợi của mình, vì reviews.due sẽ được tải lại sau mỗi lần chấm.
 */
export function useGradeWord() {
  const queryClient = useQueryClient();
  return useMutation<GradeResponse, Error, { wordId: string; quality: Quality }>({
    mutationFn: ({ wordId, quality }) => reviewApi.grade(wordId, quality),
    onSuccess: ({ word }) => {
      patchWordInCaches(queryClient, word.id, () => word);
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.due });
      void queryClient.invalidateQueries({ queryKey: queryKeys.words.today });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });
}
