import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { examAdminApi } from '@/api/examAdminApi';
import { queryKeys } from '@/api/queryKeys';
import type { AdminExam, ExamStatus, MondaiType } from '@/types/exam';
import type { JlptLevel } from '@/types/word';

/** GET /admin/exams (FR-CMS-01) */
export function useAdminExams(filter: { level?: JlptLevel; status?: ExamStatus }) {
  return useQuery({
    queryKey: queryKeys.admin.exams.list(filter),
    queryFn: ({ signal }) => examAdminApi.list(filter, signal),
  });
}

/** GET /admin/exams/:id: trọn cây đề. Trình soạn cập nhật cache này sau mỗi lần lưu. */
export function useAdminExam(examId: string) {
  return useQuery({
    queryKey: queryKeys.admin.exams.detail(examId),
    queryFn: ({ signal }) => examAdminApi.get(examId, signal),
    refetchOnWindowFocus: false,
  });
}

export function useMondaiTypes() {
  return useQuery({
    queryKey: queryKeys.admin.mondaiTypes,
    queryFn: ({ signal }) => examAdminApi.mondaiTypes(signal),
    staleTime: 5 * 60_000,
  });
}

/** Đề thay đổi: làm mới danh sách quản trị và mọi dữ liệu đề của người học. */
function useInvalidateExams() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.exams.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all }),
    ]);
}

/** Ghi cây đề mới (response của thêm/xóa/sắp xếp/đổi trạng thái) vào cache của trình soạn. */
export function useSetExamTree() {
  const queryClient = useQueryClient();
  return (exam: AdminExam) => queryClient.setQueryData(queryKeys.admin.exams.detail(exam.id), exam);
}

export function useCreateExam() {
  const invalidate = useInvalidateExams();
  return useMutation({ mutationFn: examAdminApi.create, onSuccess: invalidate });
}

export function useDeleteExam() {
  const invalidate = useInvalidateExams();
  return useMutation({ mutationFn: examAdminApi.remove, onSuccess: invalidate });
}

export function useDuplicateExam() {
  const invalidate = useInvalidateExams();
  return useMutation({ mutationFn: examAdminApi.duplicate, onSuccess: invalidate });
}

export function useSetExamStatus() {
  const invalidate = useInvalidateExams();
  const setTree = useSetExamTree();
  return useMutation({
    mutationFn: ({ examId, status }: { examId: string; status: ExamStatus }) => examAdminApi.setStatus(examId, status),
    onSuccess: (exam) => {
      setTree(exam);
      return invalidate();
    },
  });
}

export function useValidateExam() {
  return useMutation({ mutationFn: examAdminApi.validate });
}

export function useImportDryRun() {
  return useMutation({ mutationFn: examAdminApi.importDryRun });
}

export function useImportExam() {
  const invalidate = useInvalidateExams();
  return useMutation({ mutationFn: examAdminApi.importExam, onSuccess: invalidate });
}

/** GET /admin/questions/:id/history (FR-CMS-18) */
export function useQuestionHistory(questionId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.exams.history(questionId),
    queryFn: ({ signal }) => examAdminApi.questionHistory(questionId, signal),
    enabled,
  });
}

export function useSaveMondaiType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, isNew }: { type: MondaiType; isNew: boolean }) => {
      const { id, ...rest } = type;
      return isNew ? examAdminApi.createMondaiType(type) : examAdminApi.updateMondaiType(id, rest);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.mondaiTypes }),
  });
}
