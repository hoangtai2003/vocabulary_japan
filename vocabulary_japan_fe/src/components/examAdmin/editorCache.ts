import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '@/api/queryKeys';
import type { AdminExam, AdminMondai, AdminPassage, AdminQuestion, AdminSection } from '@/types/exam';
import { assignNumbers } from '@/utils/exam';

/** Đánh số lại câu của mọi phần thi (DR-EX-05), sau khi đổi số ghi đè. */
export function renumber(exam: AdminExam): AdminExam {
  return {
    ...exam,
    sections: exam.sections.map((s) => {
      const numbered = assignNumbers(s.mondai);
      return { ...s, mondai: s.mondai.map((m, i) => ({ ...m, questions: numbered[i]! })) };
    }),
  };
}

const mapMondai = (exam: AdminExam, fn: (m: AdminMondai) => AdminMondai): AdminExam => ({
  ...exam,
  sections: exam.sections.map((s) => ({ ...s, mondai: s.mondai.map(fn) })),
});

export const patchSection = (id: string, patch: Partial<AdminSection>) => (exam: AdminExam) => ({
  ...exam,
  sections: exam.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
});

export const patchMondai = (id: string, patch: Partial<AdminMondai>) => (exam: AdminExam) =>
  mapMondai(exam, (m) => (m.id === id ? { ...m, ...patch } : m));

export const patchPassage = (id: string, patch: Partial<AdminPassage>) => (exam: AdminExam) =>
  mapMondai(exam, (m) => ({ ...m, passages: m.passages.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

export const patchQuestion = (question: AdminQuestion) => (exam: AdminExam) =>
  renumber(mapMondai(exam, (m) => ({ ...m, questions: m.questions.map((q) => (q.id === question.id ? question : q)) })));

/** Sửa cây đề trong cache của trình soạn (không gọi API). */
export function usePatchExam(examId: string) {
  const queryClient = useQueryClient();
  return useCallback(
    (fn: (exam: AdminExam) => AdminExam) =>
      queryClient.setQueryData<AdminExam>(queryKeys.admin.exams.detail(examId), (old) => (old ? fn(old) : old)),
    [queryClient, examId],
  );
}
