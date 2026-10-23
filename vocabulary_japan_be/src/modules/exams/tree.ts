import { prisma } from '../../db/prisma.ts';
import {
  assignNumbers,
  EMPTY_EXPLANATION,
  type AnswerKind,
  type Explanation,
  type MondaiTypeRule,
  type ValidationExam,
} from '../../domain/exam.ts';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { attachmentSchema, explanationSchema } from '../examAdmin/schemas.ts';

/**
 * Cây đề đọc từ DB (đề → phần thi → mondai → bài đọc, câu hỏi), sắp đúng thứ tự, và các hàm đổi
 * sang JSON của hợp đồng. Dùng chung cho trang Quản trị, kiểm tra, xuất file và màn hình làm bài.
 */
export const examTreeInclude = {
  sections: {
    orderBy: { position: 'asc' },
    include: {
      mondai: {
        orderBy: { position: 'asc' },
        include: {
          type: true,
          passages: { orderBy: { position: 'asc' } },
          questions: { orderBy: { position: 'asc' } },
        },
      },
    },
  },
} satisfies Prisma.ExamInclude;

export type ExamTree = Prisma.ExamGetPayload<{ include: typeof examTreeInclude }>;
export type SectionModel = ExamTree['sections'][number];
export type MondaiModel = SectionModel['mondai'][number];
export type QuestionModel = MondaiModel['questions'][number];
export type PassageModel = MondaiModel['passages'][number];

type Db = PrismaClient | Prisma.TransactionClient;

export async function loadExamTree(id: string, db: Db = prisma): Promise<ExamTree> {
  const exam = await db.exam.findUnique({ where: { id }, include: examTreeInclude });
  if (!exam) throw ApiError.notFound('Không tìm thấy đề');
  return exam;
}

/** Json trong DB → Explanation đủ 6 mục (dữ liệu hỏng thì coi như chưa có lời giải). */
export function readExplanation(value: unknown): Explanation {
  const parsed = explanationSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : { ...EMPTY_EXPLANATION };
}

export function readAttachments(value: unknown) {
  const parsed = attachmentSchema.array().safeParse(value ?? []);
  return parsed.success ? parsed.data : [];
}

/** Số câu (DR-EX-05) của mọi câu trong đề: question id → số. */
export function questionNumbers(exam: Pick<ExamTree, 'sections'>): Map<string, number> {
  const numbers = new Map<string, number>();
  for (const section of exam.sections) {
    const numbered = assignNumbers(
      section.mondai.map((m) => ({ questions: m.questions.map((q) => ({ id: q.id, number_override: q.numberOverride })) })),
    );
    for (const list of numbered) for (const q of list) numbers.set(q.id, q.number);
  }
  return numbers;
}

export function toMondaiTypeJson(type: NonNullable<MondaiModel['type']>) {
  return {
    id: type.id,
    level: type.level,
    section_title: type.sectionTitle,
    label_ja: type.labelJa,
    name_vi: type.nameVi,
    answer_kind: type.answerKind,
    has_passage: type.hasPassage,
    default_instructions: type.defaultInstructions,
    sort_order: type.sortOrder,
  };
}

export function toExamInfoJson(exam: Omit<ExamTree, 'sections'>) {
  return {
    id: exam.id,
    title: exam.title,
    level: exam.level,
    difficulty: exam.difficulty,
    description: exam.description,
    instructions: exam.instructions,
    source: exam.source,
    status: exam.status,
    published_at: exam.publishedAt?.toISOString() ?? null,
    created_at: exam.createdAt.toISOString(),
    updated_at: exam.updatedAt.toISOString(),
  };
}

export function toPassageJson(p: PassageModel) {
  return {
    id: p.id,
    position: p.position,
    label: p.label,
    intro: p.intro,
    content: p.content,
    content_furigana: p.contentFurigana,
    translation_vi: p.translationVi,
    attachments: readAttachments(p.attachments),
  };
}

export function toAdminQuestionJson(q: QuestionModel, number: number) {
  return {
    id: q.id,
    position: q.position,
    number,
    number_override: q.numberOverride,
    passage_id: q.passageId,
    kind: q.kind as AnswerKind,
    prompt: q.prompt,
    options: q.options,
    correct_option: q.correctOption,
    star_prefix: q.starPrefix,
    star_suffix: q.starSuffix,
    star_position: q.starPosition,
    star_order: q.starOrder,
    explanation: readExplanation(q.explanation),
    learner_note: q.learnerNote,
    needs_review: q.needsReview,
    internal_note: q.internalNote,
    attachments: readAttachments(q.attachments),
    updated_at: q.updatedAt.toISOString(),
  };
}

/** Trọn cây đề kèm đáp án, lời giải, ghi chú nội bộ — chỉ cho quản trị viên (GET /admin/exams/:id). */
export function toAdminExamJson(exam: ExamTree, attemptCount: number) {
  const numbers = questionNumbers(exam);
  return {
    ...toExamInfoJson(exam),
    attempt_count: attemptCount,
    sections: exam.sections.map((s) => ({
      id: s.id,
      position: s.position,
      title: s.title,
      kind: s.kind,
      duration_minutes: s.durationMinutes,
      score_group: s.scoreGroup,
      mondai: s.mondai.map((m) => ({
        id: m.id,
        position: m.position,
        number: m.number,
        type_id: m.typeId,
        instructions: m.instructions,
        tip: m.tip,
        passages: m.passages.map(toPassageJson),
        questions: m.questions.map((q) => toAdminQuestionJson(q, numbers.get(q.id)!)),
      })),
    })),
  };
}
export type AdminExamJson = ReturnType<typeof toAdminExamJson>;

/** Cây đề → đầu vào của validateExam (domain/exam.ts). */
export function toValidationExam(exam: ExamTree): ValidationExam {
  return {
    level: exam.level,
    sections: exam.sections.map((s) => ({
      title: s.title,
      duration_minutes: s.durationMinutes,
      mondai: s.mondai.map((m) => ({
        number: m.number,
        type_id: m.typeId,
        instructions: m.instructions,
        tip: m.tip,
        passages: m.passages.map((p) => ({
          ref: p.id,
          intro: p.intro,
          content: p.content,
          content_furigana: p.contentFurigana,
          translation_vi: p.translationVi,
        })),
        questions: m.questions.map((q) => ({
          number_override: q.numberOverride,
          passage_ref: q.passageId,
          kind: q.kind,
          prompt: q.prompt,
          options: q.options,
          correct_option: q.correctOption,
          star_prefix: q.starPrefix,
          star_suffix: q.starSuffix,
          star_position: q.starPosition,
          star_order: q.starOrder,
          explanation: readExplanation(q.explanation),
          learner_note: q.learnerNote,
          needs_review: q.needsReview,
        })),
      })),
    })),
  };
}

export async function mondaiTypeRules(db: Db = prisma): Promise<Map<string, MondaiTypeRule>> {
  const types = await db.mondaiType.findMany();
  return new Map(types.map((t) => [t.id, { level: t.level, answer_kind: t.answerKind, has_passage: t.hasPassage }]));
}

export async function knownUploadIds(db: Db = prisma): Promise<Set<string>> {
  const uploads = await db.upload.findMany({ select: { id: true } });
  return new Set(uploads.map((u) => u.id));
}
