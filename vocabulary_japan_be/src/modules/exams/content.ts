import { prisma } from '../../db/prisma.ts';
import type { Explanation } from '../../domain/exam.ts';
import type { Prisma } from '../../generated/prisma/client.ts';
import { questionNumbers, readAttachments, readExplanation, type PassageModel, type QuestionModel } from './tree.ts';

/**
 * Nội dung đề theo bộ câu đã chốt của một lượt làm: các phần thi (kể cả từ nhiều đề, khi luyện
 * theo dạng hoặc làm lại câu sai), mondai, bài đọc và câu hỏi, kèm số câu như trong đề gốc.
 */
export const attemptSectionInclude = {
  exam: { select: { id: true, title: true, level: true } },
  mondai: {
    orderBy: { position: 'asc' },
    include: {
      type: true,
      passages: { orderBy: { position: 'asc' } },
      questions: { orderBy: { position: 'asc' } },
    },
  },
} satisfies Prisma.ExamSectionInclude;

export type AttemptSectionContent = Prisma.ExamSectionGetPayload<{ include: typeof attemptSectionInclude }>;

export async function loadSections(sectionIds: string[]) {
  const sections = await prisma.examSection.findMany({ where: { id: { in: sectionIds } }, include: attemptSectionInclude });
  const byId = new Map(sections.map((s) => [s.id, s]));
  return { byId, numbers: questionNumbers({ sections }) };
}

/** Câu hỏi khi đang làm: không có đáp án, lời giải hay ghi chú (FR-RUN-14, NFR-EX-05). */
export function toLearnerQuestion(q: QuestionModel, number: number) {
  return {
    id: q.id,
    number,
    kind: q.kind,
    prompt: q.prompt,
    options: q.options,
    star_prefix: q.starPrefix,
    star_suffix: q.starSuffix,
    star_position: q.starPosition,
    passage_id: q.passageId,
    attachments: readAttachments(q.attachments),
  };
}

/** Bài đọc khi đang làm; bản furigana và bản dịch thuộc lời giải nên chỉ gửi khi được phép. */
export function toLearnerPassage(p: PassageModel, withSolution: boolean) {
  return {
    id: p.id,
    label: p.label,
    intro: p.intro,
    content: p.content,
    attachments: readAttachments(p.attachments),
    content_furigana: withSolution ? p.contentFurigana : null,
    translation_vi: withSolution ? p.translationVi : null,
  };
}

/**
 * Mondai của một phần thi, chỉ giữ câu thuộc bộ câu đã chốt (và bài đọc của các câu đó). Mondai
 * không còn câu nào thì bỏ.
 */
export function pickMondai(section: AttemptSectionContent, questionIds: Set<string>) {
  return section.mondai
    .map((m) => {
      const questions = m.questions.filter((q) => questionIds.has(q.id));
      const passageIds = new Set(questions.map((q) => q.passageId));
      return { mondai: m, questions, passages: m.passages.filter((p) => passageIds.has(p.id)) };
    })
    .filter((m) => m.questions.length > 0);
}

/** Từ nào trong lời giải đã có trong lịch ôn của người học (FR-EXP-07: nút "Đã có trong ôn tập"). */
export async function wordsInReviews(userId: string, explanations: Explanation[]): Promise<Set<string>> {
  const ids = [...new Set(explanations.flatMap((e) => e.vocab.map((v) => v.word_id)).filter((id): id is string => !!id))];
  if (ids.length === 0) return new Set();
  const rows = await prisma.userWord.findMany({
    where: { userId, wordId: { in: ids }, status: { not: 'new' } },
    select: { wordId: true },
  });
  return new Set(rows.map((r) => r.wordId));
}

/** Lời giải gửi cho người học: mục từ vựng kèm in_reviews. */
export function toLearnerExplanation(value: unknown, inReviews: Set<string>) {
  const e = readExplanation(value);
  return { ...e, vocab: e.vocab.map((v) => ({ ...v, in_reviews: v.word_id ? inReviews.has(v.word_id) : false })) };
}

/** Đáp án, lời giải của một câu: chỉ gửi sau khi phần đã nộp, hoặc ngay sau khi trả lời ở chế độ luyện. */
export function toSolution(q: QuestionModel, inReviews: Set<string>) {
  return {
    correct_option: q.correctOption,
    star_order: q.starOrder,
    explanation: toLearnerExplanation(q.explanation, inReviews),
    learner_note: q.learnerNote,
  };
}
