import type { AdminExam, ExamIssue, MondaiType } from '@/types/exam';
import { validateExam, type MondaiTypeRule, type ValidationExam, type ValidationResult } from '@/utils/exam';
import type { Selection } from './ExamOutline';

/** Cây đề của trình soạn → đầu vào của validateExam (cùng luật DR-EX-10 với server). */
export function toValidationExam(exam: AdminExam): ValidationExam {
  return {
    level: exam.level,
    sections: exam.sections.map((s) => ({
      title: s.title,
      duration_minutes: s.duration_minutes,
      mondai: s.mondai.map((m) => ({
        number: m.number,
        type_id: m.type_id,
        instructions: m.instructions,
        tip: m.tip,
        passages: m.passages.map((p) => ({
          ref: p.id,
          intro: p.intro,
          content: p.content,
          content_furigana: p.content_furigana,
          translation_vi: p.translation_vi,
        })),
        questions: m.questions.map((q) => ({ ...q, passage_ref: q.passage_id })),
      })),
    })),
  };
}

/**
 * Kiểm tra ngay trên trình duyệt khi soạn (không kiểm tra ảnh đã tải lên; server kiểm tra đủ khi
 * xuất bản).
 */
export function validateLocally(exam: AdminExam, types: MondaiType[]): ValidationResult {
  const rules = new Map<string, MondaiTypeRule>(
    types.map((t) => [t.id, { level: t.level, answer_kind: t.answer_kind, has_passage: t.has_passage }]),
  );
  return validateExam(toValidationExam(exam), rules);
}

/** Vị trí của lỗi → mục cần mở trong trình soạn (câu, mondai, phần thi). */
export function selectionOf(exam: AdminExam, issue: ExamIssue): Selection | null {
  const { section: sectionNo, mondai: mondaiNo, question: questionNo, field } = issue.location;
  if (sectionNo === null) return field === 'title' || field === 'source' ? { kind: 'exam' } : null;
  const section = exam.sections[sectionNo - 1];
  if (!section) return null;
  if (questionNo !== null) {
    const question = section.mondai.flatMap((m) => m.questions).find((q) => q.number === questionNo);
    if (question) return { kind: 'question', id: question.id };
  }
  if (mondaiNo !== null) {
    const mondai = section.mondai.find((m) => m.number === mondaiNo);
    if (mondai) {
      if (field?.startsWith('passage') && mondai.passages[0]) return { kind: 'passage', id: mondai.passages[0].id };
      return { kind: 'mondai', id: mondai.id };
    }
  }
  return { kind: 'section', id: section.id };
}

/** Mô tả vị trí: "Phần 2 · 問題3 · câu 18 · prompt". */
export function describeLocation(issue: ExamIssue): string {
  const { section, mondai, question, field } = issue.location;
  return [
    section !== null ? `Phần ${section}` : null,
    mondai !== null ? `問題${mondai}` : null,
    question !== null ? `câu ${question}` : null,
    field,
  ]
    .filter(Boolean)
    .join(' · ');
}
