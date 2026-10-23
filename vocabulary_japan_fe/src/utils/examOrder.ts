import type { AdminExam, ExamOrder } from '@/types/exam';

/** Loại nút trong cây đề có thể kéo thả (FR-CMS-03). */
export type OrderNodeKind = 'section' | 'mondai' | 'passage' | 'question';

/** Thứ tự hiện tại của cây đề, đúng hình dạng body của PUT /admin/exams/:id/order. */
export function toOrder(exam: AdminExam): ExamOrder {
  return {
    sections: exam.sections.map((s) => ({
      id: s.id,
      mondai: s.mondai.map((m) => ({
        id: m.id,
        passages: m.passages.map((p) => p.id),
        questions: m.questions.map((q) => q.id),
      })),
    })),
  };
}

/**
 * Chuyển một nút tới vị trí `index` trong cha `parentId` (phần thi: không có cha; mondai: phần thi;
 * bài đọc, câu hỏi: mondai). `index` tính trên danh sách sau khi đã gỡ nút khỏi chỗ cũ. Trả về
 * thứ tự mới, hoặc null nếu không đổi gì hay đích không hợp lệ.
 */
export function moveNode(
  order: ExamOrder,
  kind: OrderNodeKind,
  id: string,
  parentId: string | null,
  index: number,
): ExamOrder | null {
  const next: ExamOrder = structuredClone(order);
  const place = <T>(list: T[], item: T) => list.splice(Math.max(0, Math.min(index, list.length)), 0, item);

  if (kind === 'section') {
    const from = next.sections.findIndex((s) => s.id === id);
    if (from < 0) return null;
    const [item] = next.sections.splice(from, 1);
    place(next.sections, item!);
  } else if (kind === 'mondai') {
    const source = next.sections.find((s) => s.mondai.some((m) => m.id === id));
    const target = next.sections.find((s) => s.id === parentId);
    if (!source || !target) return null;
    const [item] = source.mondai.splice(source.mondai.findIndex((m) => m.id === id), 1);
    place(target.mondai, item!);
  } else {
    const key = kind === 'passage' ? 'passages' : 'questions';
    const allMondai = next.sections.flatMap((s) => s.mondai);
    const source = allMondai.find((m) => m[key].includes(id));
    const target = allMondai.find((m) => m.id === parentId);
    if (!source || !target) return null;
    source[key].splice(source[key].indexOf(id), 1);
    place(target[key], id);
  }
  return JSON.stringify(next) === JSON.stringify(order) ? null : next;
}
