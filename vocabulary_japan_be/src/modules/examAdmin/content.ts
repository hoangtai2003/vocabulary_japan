import type { z } from 'zod';
import { prisma } from '../../db/prisma.ts';
import { starAnswer, type Explanation } from '../../domain/exam.ts';
import type { Prisma } from '../../generated/prisma/client.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { runInBackground } from '../../utils/background.ts';
import { gradedAttemptCount, recountAttempt, regradeQuestion } from '../exams/grading.ts';
import { questionNumbers, toAdminQuestionJson, toPassageJson } from '../exams/tree.ts';
import type {
  mondaiCreateSchema,
  mondaiUpdateSchema,
  passageCreateSchema,
  passageUpdateSchema,
  QuestionCreateInput,
  QuestionUpdateInput,
  sectionCreateSchema,
  sectionUpdateSchema,
} from './schemas.ts';
import { getAdminExam } from './service.ts';
import { linkVocabulary } from './vocab.ts';

/**
 * Soạn từng tầng của đề (FR-CMS-03 đến 10). Thêm và xóa đổi cấu trúc (số câu, thứ tự) nên trả về
 * trọn cây đề; sửa (tự lưu) chỉ trả về phần vừa sửa. Mọi thay đổi có hiệu lực ngay, kể cả với đề
 * đã xuất bản (FR-CMS-16).
 */

const touchExam = (tx: Prisma.TransactionClient, examId: string) =>
  tx.exam.update({ where: { id: examId }, data: { updatedAt: new Date() } });

async function nextPosition(count: Promise<{ _max: { position: number | null } }>) {
  const { _max } = await count;
  return (_max.position ?? -1) + 1;
}

// ---------- Phần thi ----------

export async function createSection(input: z.infer<typeof sectionCreateSchema>) {
  const exam = await prisma.exam.findUnique({ where: { id: input.exam_id }, select: { id: true } });
  if (!exam) throw ApiError.validation({ exam_id: 'Đề không tồn tại' });
  const position = await nextPosition(prisma.examSection.aggregate({ where: { examId: exam.id }, _max: { position: true } }));
  await prisma.$transaction(async (tx) => {
    await tx.examSection.create({
      data: {
        examId: exam.id,
        position,
        title: input.title,
        kind: input.kind,
        durationMinutes: input.duration_minutes,
        scoreGroup: input.score_group,
      },
    });
    await touchExam(tx, exam.id);
  });
  return getAdminExam(exam.id);
}

async function findSection(id: string) {
  const section = await prisma.examSection.findUnique({ where: { id } });
  if (!section) throw ApiError.notFound('Không tìm thấy phần thi');
  return section;
}

export async function updateSection(id: string, input: z.infer<typeof sectionUpdateSchema>) {
  const section = await findSection(id);
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.examSection.update({
      where: { id },
      data: {
        title: input.title,
        kind: input.kind,
        durationMinutes: input.duration_minutes,
        scoreGroup: input.score_group,
      },
    });
    await touchExam(tx, section.examId);
    return row;
  });
  return {
    id: updated.id,
    position: updated.position,
    title: updated.title,
    kind: updated.kind,
    duration_minutes: updated.durationMinutes,
    score_group: updated.scoreGroup,
  };
}

/** Xóa câu hỏi làm đổi tổng số câu của các lượt đã chốt bộ câu: đếm lại điểm (chạy nền). */
async function recountAfterDelete(questionIds: string[]) {
  if (questionIds.length === 0) return () => undefined;
  const attempts = await prisma.attempt.findMany({
    where: { questionIds: { hasSome: questionIds } },
    select: { id: true, status: true },
  });
  return () => {
    if (attempts.length === 0) return;
    runInBackground('Đếm lại điểm sau khi xóa câu hỏi thất bại', () =>
      prisma.$transaction(async (tx) => {
        for (const attempt of attempts) await recountAttempt(tx, attempt.id);
        await tx.attempt.updateMany({
          where: { id: { in: attempts.filter((a) => a.status === 'submitted').map((a) => a.id) } },
          data: { regradedAt: new Date() },
        });
      }),
    );
  };
}

export async function deleteSection(id: string) {
  const section = await findSection(id);
  const questions = await prisma.question.findMany({ where: { mondai: { sectionId: id } }, select: { id: true } });
  const recount = await recountAfterDelete(questions.map((q) => q.id));
  await prisma.$transaction(async (tx) => {
    await tx.examSection.delete({ where: { id } });
    await touchExam(tx, section.examId);
  });
  recount();
  return getAdminExam(section.examId);
}

// ---------- Mondai ----------

async function findMondai(id: string) {
  const mondai = await prisma.mondai.findUnique({ where: { id }, include: { section: { select: { examId: true } } } });
  if (!mondai) throw ApiError.notFound('Không tìm thấy mondai');
  return mondai;
}

async function assertType(typeId: string | null | undefined) {
  if (!typeId) return null;
  const type = await prisma.mondaiType.findUnique({ where: { id: typeId } });
  if (!type) throw ApiError.validation({ type_id: 'Dạng mondai không tồn tại' });
  return type;
}

export async function createMondai(input: z.infer<typeof mondaiCreateSchema>) {
  const section = await prisma.examSection.findUnique({ where: { id: input.section_id } });
  if (!section) throw ApiError.validation({ section_id: 'Phần thi không tồn tại' });
  const type = await assertType(input.type_id);
  const position = await nextPosition(prisma.mondai.aggregate({ where: { sectionId: section.id }, _max: { position: true } }));
  const lastNumber = await prisma.mondai.aggregate({ where: { sectionId: section.id }, _max: { number: true } });
  await prisma.$transaction(async (tx) => {
    await tx.mondai.create({
      data: {
        sectionId: section.id,
        position,
        number: input.number ?? (lastNumber._max.number ?? 0) + 1,
        typeId: type?.id ?? null,
        // Câu hướng dẫn mặc định theo dạng mondai (FR-CMS-04).
        instructions: input.instructions || type?.defaultInstructions || '',
        tip: input.tip,
      },
    });
    await touchExam(tx, section.examId);
  });
  return getAdminExam(section.examId);
}

export async function updateMondai(id: string, input: z.infer<typeof mondaiUpdateSchema>) {
  const mondai = await findMondai(id);
  if (input.type_id !== undefined) await assertType(input.type_id);
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.mondai.update({
      where: { id },
      data: { number: input.number, typeId: input.type_id, instructions: input.instructions, tip: input.tip },
    });
    await touchExam(tx, mondai.section.examId);
    return row;
  });
  return {
    id: updated.id,
    position: updated.position,
    number: updated.number,
    type_id: updated.typeId,
    instructions: updated.instructions,
    tip: updated.tip,
  };
}

export async function deleteMondai(id: string) {
  const mondai = await findMondai(id);
  const questions = await prisma.question.findMany({ where: { mondaiId: id }, select: { id: true } });
  const recount = await recountAfterDelete(questions.map((q) => q.id));
  await prisma.$transaction(async (tx) => {
    await tx.mondai.delete({ where: { id } });
    await touchExam(tx, mondai.section.examId);
  });
  recount();
  return getAdminExam(mondai.section.examId);
}

// ---------- Bài đọc ----------

async function findPassage(id: string) {
  const passage = await prisma.passage.findUnique({
    where: { id },
    include: { mondai: { select: { section: { select: { examId: true } } } } },
  });
  if (!passage) throw ApiError.notFound('Không tìm thấy bài đọc');
  return passage;
}

export async function createPassage(input: z.infer<typeof passageCreateSchema>) {
  const mondai = await prisma.mondai.findUnique({ where: { id: input.mondai_id }, include: { section: true } });
  if (!mondai) throw ApiError.validation({ mondai_id: 'Mondai không tồn tại' });
  const position = await nextPosition(prisma.passage.aggregate({ where: { mondaiId: mondai.id }, _max: { position: true } }));
  await prisma.$transaction(async (tx) => {
    await tx.passage.create({
      data: {
        mondaiId: mondai.id,
        position,
        label: input.label,
        intro: input.intro,
        content: input.content,
        contentFurigana: input.content_furigana,
        translationVi: input.translation_vi,
        attachments: input.attachments,
      },
    });
    await touchExam(tx, mondai.section.examId);
  });
  return getAdminExam(mondai.section.examId);
}

export async function updatePassage(id: string, input: z.infer<typeof passageUpdateSchema>) {
  const passage = await findPassage(id);
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.passage.update({
      where: { id },
      data: {
        label: input.label,
        intro: input.intro,
        content: input.content,
        contentFurigana: input.content_furigana,
        translationVi: input.translation_vi,
        attachments: input.attachments,
      },
    });
    await touchExam(tx, passage.mondai.section.examId);
    return row;
  });
  return toPassageJson(updated);
}

export async function deletePassage(id: string) {
  const passage = await findPassage(id);
  await prisma.$transaction(async (tx) => {
    await tx.passage.delete({ where: { id } });
    await touchExam(tx, passage.mondai.section.examId);
  });
  return getAdminExam(passage.mondai.section.examId);
}

// ---------- Câu hỏi ----------

async function findQuestion(id: string) {
  const question = await prisma.question.findUnique({
    where: { id },
    include: { mondai: { select: { sectionId: true, section: { select: { examId: true } } } } },
  });
  if (!question) throw ApiError.notFound('Không tìm thấy câu hỏi');
  return question;
}

async function assertPassageInMondai(passageId: string | null | undefined, mondaiId: string) {
  if (!passageId) return;
  const passage = await prisma.passage.findUnique({ where: { id: passageId }, select: { mondaiId: true } });
  if (!passage || passage.mondaiId !== mondaiId) {
    throw ApiError.validation({ passage_id: 'Bài đọc không thuộc mondai của câu này' });
  }
}

/** Đáp án đúng lưu trong DB: câu ★ tự tính là mảnh nằm ở ô ★ (FR-CMS-08). */
const computeCorrect = (q: { kind: string; correct_option: number | null; star_order: number[]; star_position: number | null }) =>
  q.kind === 'star' ? starAnswer(q.star_order, q.star_position) : q.correct_option;

/** Số câu hiện tại của một câu (cần cả phần thi để đánh số, DR-EX-05). */
async function numberOf(sectionId: string, questionId: string) {
  const section = await prisma.examSection.findUniqueOrThrow({
    where: { id: sectionId },
    include: { mondai: { orderBy: { position: 'asc' }, include: { questions: { orderBy: { position: 'asc' } } } } },
  });
  return questionNumbers({ sections: [section] } as Parameters<typeof questionNumbers>[0]).get(questionId)!;
}

export async function createQuestion(input: QuestionCreateInput) {
  const mondai = await prisma.mondai.findUnique({ where: { id: input.mondai_id }, include: { section: true, type: true } });
  if (!mondai) throw ApiError.validation({ mondai_id: 'Mondai không tồn tại' });
  await assertPassageInMondai(input.passage_id, mondai.id);
  const kind = input.kind ?? mondai.type?.answerKind ?? 'choice';
  const position = await nextPosition(prisma.question.aggregate({ where: { mondaiId: mondai.id }, _max: { position: true } }));
  await linkVocabulary([input.explanation]);
  const options = input.options.length > 0 ? input.options : ['', '', '', ''];
  await prisma.$transaction(async (tx) => {
    await tx.question.create({
      data: {
        mondaiId: mondai.id,
        passageId: input.passage_id,
        position,
        numberOverride: input.number_override,
        kind,
        prompt: input.prompt,
        options,
        correctOption: computeCorrect({ ...input, kind }),
        starPrefix: input.star_prefix,
        starSuffix: input.star_suffix,
        starPosition: input.star_position,
        starOrder: input.star_order,
        explanation: input.explanation,
        learnerNote: input.learner_note,
        needsReview: input.needs_review,
        internalNote: input.internal_note,
        attachments: input.attachments,
      },
    });
    await touchExam(tx, mondai.section.examId);
  });
  return getAdminExam(mondai.section.examId);
}

/** Trường của hợp đồng ↔ cột trong DB, để ghi lịch sử sửa (FR-CMS-18) theo tên trường của hợp đồng. */
const QUESTION_FIELDS = {
  passage_id: 'passageId',
  kind: 'kind',
  number_override: 'numberOverride',
  prompt: 'prompt',
  options: 'options',
  correct_option: 'correctOption',
  star_prefix: 'starPrefix',
  star_suffix: 'starSuffix',
  star_position: 'starPosition',
  star_order: 'starOrder',
  explanation: 'explanation',
  learner_note: 'learnerNote',
  needs_review: 'needsReview',
  internal_note: 'internalNote',
  attachments: 'attachments',
} as const;

/**
 * PUT /admin/questions/:id (tự lưu từng phần). Đổi đáp án đúng của câu đã có bài làm được chấm thì
 * phải gửi kèm confirm_regrade: true, nếu không trả 409 CONFIRM_REGRADE kèm số lượt sẽ bị chấm lại
 * (FR-CMS-16). Sau khi lưu, chấm lại chạy nền (FR-RES-10, NFR-EX-09).
 */
export async function updateQuestion(id: string, input: QuestionUpdateInput, editorId: string | null) {
  const before = await findQuestion(id);
  const { confirm_regrade: confirmRegrade, ...changes } = input;
  if (changes.passage_id !== undefined) await assertPassageInMondai(changes.passage_id, before.mondaiId);
  if (changes.explanation) await linkVocabulary([changes.explanation as Explanation]);

  const merged = {
    kind: changes.kind ?? before.kind,
    correct_option: changes.correct_option !== undefined ? changes.correct_option : before.correctOption,
    star_order: changes.star_order ?? before.starOrder,
    star_position: changes.star_position !== undefined ? changes.star_position : before.starPosition,
  };
  const correct = computeCorrect(merged);
  const answerChanged = correct !== before.correctOption;

  if (answerChanged) {
    const affected = await gradedAttemptCount(id);
    if (affected > 0 && !confirmRegrade) {
      throw ApiError.conflict(
        'CONFIRM_REGRADE',
        `Đổi đáp án đúng sẽ chấm lại ${affected} lượt làm đã nộp. Xác nhận để lưu.`,
        { attempt_count: affected },
      );
    }
  }

  const changedFields = (Object.keys(changes) as (keyof typeof QUESTION_FIELDS)[]).filter((key) => {
    const column = QUESTION_FIELDS[key];
    const old = before[column] as unknown;
    return JSON.stringify(old) !== JSON.stringify(changes[key]);
  });
  if (answerChanged && !changedFields.includes('correct_option')) changedFields.push('correct_option');

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.question.update({
      where: { id },
      data: {
        passageId: changes.passage_id,
        kind: changes.kind,
        numberOverride: changes.number_override,
        prompt: changes.prompt,
        options: changes.options,
        correctOption: correct,
        starPrefix: changes.star_prefix,
        starSuffix: changes.star_suffix,
        starPosition: changes.star_position,
        starOrder: changes.star_order,
        explanation: changes.explanation,
        learnerNote: changes.learner_note,
        needsReview: changes.needs_review,
        internalNote: changes.internal_note,
        attachments: changes.attachments,
      },
    });
    if (changedFields.length > 0) {
      await tx.questionEdit.create({ data: { questionId: id, userId: editorId, fields: changedFields } });
      await touchExam(tx, before.mondai.section.examId);
    }
    return row;
  });

  if (answerChanged) runInBackground('Chấm lại sau khi sửa đáp án thất bại', () => regradeQuestion(id));
  return toAdminQuestionJson(updated, await numberOf(before.mondai.sectionId, id));
}

export async function deleteQuestion(id: string) {
  const question = await findQuestion(id);
  const recount = await recountAfterDelete([id]);
  await prisma.$transaction(async (tx) => {
    await tx.question.delete({ where: { id } });
    await touchExam(tx, question.mondai.section.examId);
  });
  recount();
  return getAdminExam(question.mondai.section.examId);
}

/** GET /admin/questions/:id/history (FR-CMS-18): ai sửa, lúc nào, trường nào; mới nhất trước. */
export async function questionHistory(id: string) {
  await findQuestion(id);
  const edits = await prisma.questionEdit.findMany({
    where: { questionId: id },
    include: { user: { select: { displayName: true, email: true } } },
    orderBy: { editedAt: 'desc' },
    take: 100,
  });
  return edits.map((e) => ({
    id: e.id,
    edited_at: e.editedAt.toISOString(),
    editor: e.user ? { display_name: e.user.displayName, email: e.user.email } : null,
    fields: e.fields,
  }));
}
