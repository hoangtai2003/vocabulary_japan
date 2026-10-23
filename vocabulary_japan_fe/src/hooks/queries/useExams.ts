import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { examsApi } from '@/api/examsApi';
import { queryKeys } from '@/api/queryKeys';
import type { StartAttemptRequest } from '@/types/exam';
import type { JlptLevel } from '@/types/word';

/** GET /exams?level= (FR-EXAM-01) */
export function useExamList(level: JlptLevel | undefined) {
  return useQuery({
    queryKey: queryKeys.exams.list(level),
    queryFn: ({ signal }) => examsApi.list(level, signal),
  });
}

/** GET /exams/:id (FR-EXAM-03) */
export function useExamDetail(examId: string) {
  return useQuery({
    queryKey: queryKeys.exams.detail(examId),
    queryFn: ({ signal }) => examsApi.detail(examId, signal),
  });
}

/** GET /exams/:id/attempts (FR-RES-09) */
export function useExamAttempts(examId: string) {
  return useQuery({
    queryKey: queryKeys.exams.attempts(examId),
    queryFn: ({ signal }) => examsApi.attempts(examId, signal),
  });
}

/** Sau khi bắt đầu, nộp hay kết thúc một lượt: làm mới danh sách đề, lịch sử, câu sai, thống kê. */
export function useInvalidateExamData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.exams }),
    ]);
}

/** POST /exams/:id/attempts */
export function useStartAttempt(examId: string) {
  const invalidate = useInvalidateExamData();
  return useMutation({
    mutationFn: (body: StartAttemptRequest) => examsApi.startAttempt(examId, body),
    onSuccess: invalidate,
  });
}

/**
 * GET /attempts/:id. Không tự tải lại khi quay lại tab: màn hình làm bài tự giữ trạng thái và chỉ
 * đồng bộ lại khi cần (bắt đầu/nộp phần, hết giờ). Không giữ cache sau khi rời màn hình (gcTime 0):
 * mở lại luôn lấy server_now mới, để đồng hồ không tính theo một mốc giờ đã cũ.
 */
export function useAttemptState(attemptId: string) {
  return useQuery({
    queryKey: queryKeys.attempts.state(attemptId),
    queryFn: ({ signal }) => examsApi.attempt(attemptId, signal),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 0,
  });
}

/** GET /attempts/:id/result */
export function useAttemptResult(attemptId: string) {
  return useQuery({
    queryKey: queryKeys.attempts.result(attemptId),
    queryFn: ({ signal }) => examsApi.result(attemptId, signal),
  });
}

/** GET /practice/wrong-questions (FR-EXAM-07) */
export function useWrongQuestions() {
  return useQuery({
    queryKey: queryKeys.exams.wrongQuestions,
    queryFn: ({ signal }) => examsApi.wrongQuestions(signal),
  });
}

export function useStartWrongReview() {
  const invalidate = useInvalidateExamData();
  return useMutation({ mutationFn: examsApi.startWrongReview, onSuccess: invalidate });
}

/** GET /practice/mondai-types: dạng mondai có câu để luyện theo dạng (FR-EXAM-08). */
export function usePracticeTypes(level: JlptLevel | undefined) {
  return useQuery({
    queryKey: queryKeys.exams.practiceTypes(level),
    queryFn: ({ signal }) => examsApi.practiceTypes(level, signal),
  });
}

/** POST /practice/by-type (FR-EXAM-08) */
export function useStartByType() {
  return useMutation({ mutationFn: examsApi.startByType });
}

/** GET /stats/exams (FR-EXP-08, 09) */
export function useExamStats() {
  return useQuery({
    queryKey: queryKeys.stats.exams,
    queryFn: ({ signal }) => examsApi.stats(signal),
  });
}

/** POST /reviews/from-explanation (FR-EXP-07): từ mới vào lịch ôn nên làm mới ôn tập và thống kê. */
export function useAddWordToReviews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: examsApi.addWordToReviews,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.words.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.overview }),
      ]),
  });
}
