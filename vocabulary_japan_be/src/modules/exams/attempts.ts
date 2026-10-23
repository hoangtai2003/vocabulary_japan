import { prisma } from '../../db/prisma.ts';
import type { AttemptMode, Prisma } from '../../generated/prisma/client.ts';
import { ApiError } from '../../utils/ApiError.ts';
import {
  loadSections,
  pickMondai,
  toLearnerPassage,
  toLearnerQuestion,
  toSolution,
  wordsInReviews,
  type AttemptSectionContent,
} from './content.ts';
import { gradeAnswers, recountAttempt, updateWrongList } from './grading.ts';
import type { AnswerInput, StartAttemptInput } from './schemas.ts';
import { readExplanation } from './tree.ts';

/**
 * Lượt làm bài (SRS 2.0, mục 3.12, DR-EX-13, 14).
 * - Bộ câu chốt lúc bắt đầu (question_ids) theo thứ tự trong đề.
 * - Chế độ có bấm giờ: mỗi phần có hạn nộp do server ghi lúc bắt đầu phần (FR-RUN-03); hết giờ
 *   thì phần tự nộp (FR-RUN-02) — server nộp "lười" ngay khi có request chạm tới lượt làm.
 *   Đáp án và lời giải không rời server trước khi phần được nộp (FR-RUN-14, NFR-EX-05).
 * - Chế độ không giới hạn giờ: trả lời xong là chấm ngay và trả kèm lời giải (FR-EXAM-06).
 */

type Tx = Prisma.TransactionClient;

export const TIMED_MODES: AttemptMode[] = ['exam', 'section'];
export const isTimed = (mode: AttemptMode) => TIMED_MODES.includes(mode);

const attemptNotFound = () => ApiError.notFound('Không tìm thấy lượt làm');
const alreadySubmitted = () => ApiError.conflict('ATTEMPT_SUBMITTED', 'Phần thi này đã nộp, không sửa được nữa');
const timeUp = () => ApiError.conflict('SECTION_TIME_UP', 'Đã hết giờ làm phần này. Bài đã được nộp tự động.');

const attemptInclude = {
  sections: { orderBy: { position: 'asc' } },
  answers: true,
  exam: { select: { id: true, title: true, level: true } },
  mondaiType: { select: { nameVi: true } },
} satisfies Prisma.AttemptInclude;
type AttemptWithParts = Prisma.AttemptGetPayload<{ include: typeof attemptInclude }>;

async function findOwnAttempt(userId: string, attemptId: string, db: Tx | typeof prisma = prisma) {
  const attempt = await db.attempt.findFirst({ where: { id: attemptId, userId }, include: attemptInclude });
  if (!attempt) throw attemptNotFound();
  return attempt;
}

/** Id các câu của bộ câu đã chốt nằm trong một phần thi. */
async function questionIdsInSection(tx: Tx, questionIds: string[], sectionId: string) {
  const rows = await tx.question.findMany({
    where: { id: { in: questionIds }, mondai: { sectionId } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Nộp một phần (đánh dấu có điều kiện submitted_at IS NULL, nên hai lần nộp song song chỉ một lần
 * thành công) rồi chấm. Chế độ có bấm giờ cập nhật danh sách câu sai lúc nộp; chế độ luyện đã cập
 * nhật ngay khi trả lời. Trả về false nếu phần đã nộp từ trước.
 */
async function closeSection(
  tx: Tx,
  attempt: { id: string; userId: string; mode: AttemptMode; questionIds: string[] },
  sectionId: string,
  at: Date,
) {
  const { count } = await tx.attemptSection.updateMany({
    where: { attemptId: attempt.id, sectionId, submittedAt: null },
    data: { submittedAt: at },
  });
  if (count === 0) return false;
  const result = await gradeAnswers(tx, attempt.id, await questionIdsInSection(tx, attempt.questionIds, sectionId));
  if (isTimed(attempt.mode)) await updateWrongList(tx, attempt.userId, result, at);
  return true;
}

/** Mọi phần đã nộp → lượt làm hoàn tất, đếm điểm. */
async function completeIfDone(tx: Tx, attemptId: string, at: Date) {
  const open = await tx.attemptSection.count({ where: { attemptId, submittedAt: null } });
  if (open > 0) return false;
  await tx.attempt.updateMany({ where: { id: attemptId, status: 'in_progress' }, data: { status: 'submitted', submittedAt: at } });
  await recountAttempt(tx, attemptId);
  return true;
}

/** Nộp các phần đã quá hạn (FR-RUN-02); thời điểm nộp ghi là đúng hạn nộp. */
async function finalizeExpired(attempt: AttemptWithParts, now: Date) {
  if (attempt.status !== 'in_progress' || !isTimed(attempt.mode)) return false;
  const expired = attempt.sections.filter((s) => s.deadlineAt && !s.submittedAt && s.deadlineAt <= now);
  if (expired.length === 0) return false;
  await prisma.$transaction(async (tx) => {
    for (const section of expired) await closeSection(tx, attempt, section.sectionId, section.deadlineAt!);
    const last = expired.reduce((max, s) => (s.deadlineAt! > max ? s.deadlineAt! : max), expired[0]!.deadlineAt!);
    await completeIfDone(tx, attempt.id, last);
  });
  return true;
}

/** Đọc lượt làm của người học, nộp trước các phần đã hết giờ. */
async function freshAttempt(userId: string, attemptId: string, now: Date) {
  const attempt = await findOwnAttempt(userId, attemptId);
  return (await finalizeExpired(attempt, now)) ? findOwnAttempt(userId, attemptId) : attempt;
}

// ---------- Bắt đầu ----------

/**
 * POST /exams/:id/attempts. Mỗi đề chỉ một lượt đang làm dở (FR-RUN-05): còn lượt dở mà chưa xác
 * nhận bỏ → 409 ATTEMPT_IN_PROGRESS kèm details.attempt_id; xác nhận thì lượt cũ chuyển "abandoned".
 * Khóa advisory theo (người, đề) để hai request bắt đầu song song không tạo hai lượt dở.
 */
export async function startExamAttempt(userId: string, examId: string, input: StartAttemptInput, now = new Date()) {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, status: 'published' },
    include: {
      sections: {
        orderBy: { position: 'asc' },
        include: { mondai: { orderBy: { position: 'asc' }, include: { questions: { orderBy: { position: 'asc' }, select: { id: true } } } } },
      },
    },
  });
  if (!exam) throw ApiError.notFound('Không tìm thấy đề');

  let sections = exam.sections.filter((s) => s.mondai.some((m) => m.questions.length > 0));
  let questionIds: string[];
  const scope = input.scope;
  if (scope.type === 'exam') {
    questionIds = sections.flatMap((s) => s.mondai.flatMap((m) => m.questions.map((q) => q.id)));
  } else if (scope.type === 'section') {
    sections = sections.filter((s) => s.id === scope.id);
    if (sections.length === 0) throw ApiError.validation({ scope: 'Phần thi không thuộc đề này' });
    questionIds = sections[0]!.mondai.flatMap((m) => m.questions.map((q) => q.id));
  } else {
    const section = sections.find((s) => s.mondai.some((m) => m.id === scope.id));
    if (!section) throw ApiError.validation({ scope: 'Mondai không thuộc đề này' });
    sections = [section];
    questionIds = section.mondai.find((m) => m.id === scope.id)!.questions.map((q) => q.id);
  }
  if (questionIds.length === 0) throw ApiError.validation({ scope: 'Phạm vi này chưa có câu hỏi' });
  const timed = isTimed(input.mode);
  if (timed && sections.some((s) => !s.durationMinutes)) {
    throw ApiError.validation({ scope: 'Phần thi chưa có thời gian làm bài' });
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`attempt:${userId}:${examId}`}))`;
    const current = await tx.attempt.findFirst({ where: { userId, examId, status: 'in_progress' }, select: { id: true } });
    if (current && !input.discard_in_progress) {
      throw ApiError.conflict('ATTEMPT_IN_PROGRESS', 'Bạn đang làm dở một lượt của đề này', { attempt_id: current.id });
    }
    if (current) await tx.attempt.update({ where: { id: current.id }, data: { status: 'abandoned' } });

    const attempt = await tx.attempt.create({
      data: {
        userId,
        examId,
        mode: input.mode,
        scopeType: scope.type,
        scopeId: scope.type === 'exam' ? null : scope.id,
        level: exam.level,
        questionIds,
        totalCount: questionIds.length,
        startedAt: now,
        sections: {
          create: sections.map((s, position) => ({
            sectionId: s.id,
            position,
            // Không bấm giờ: phần mở sẵn. Bấm giờ: người học bấm "Bắt đầu" từng phần.
            ...(timed ? {} : { startedAt: now }),
          })),
        },
      },
    });
    return { attempt_id: attempt.id };
  });
}

/**
 * Lượt luyện không thuộc một đề (luyện theo dạng, làm lại câu sai): các phần thi được xếp theo
 * thứ tự xuất hiện của câu trong danh sách, mở sẵn (không bấm giờ).
 */
export async function createLooseAttempt(
  userId: string,
  data: { mode: AttemptMode; scopeType: string; scopeId: string | null; level: AttemptWithParts['level']; mondaiTypeId: string | null },
  questions: { id: string; sectionId: string }[],
  now = new Date(),
) {
  const sectionIds = [...new Set(questions.map((q) => q.sectionId))];
  const attempt = await prisma.attempt.create({
    data: {
      userId,
      examId: null,
      ...data,
      questionIds: questions.map((q) => q.id),
      totalCount: questions.length,
      startedAt: now,
      sections: { create: sectionIds.map((sectionId, position) => ({ sectionId, position, startedAt: now })) },
    },
  });
  return { attempt_id: attempt.id };
}

// ---------- Trạng thái lượt làm (GET /attempts/:id) ----------

function scopeLabel(attempt: AttemptWithParts, sections: Map<string, AttemptSectionContent>) {
  switch (attempt.scopeType) {
    case 'exam':
      return 'Cả đề';
    case 'section':
      return sections.get(attempt.scopeId ?? '')?.title ?? 'Một phần thi';
    case 'mondai': {
      for (const s of sections.values()) {
        const m = s.mondai.find((x) => x.id === attempt.scopeId);
        if (m) return `${s.title} · 問題${m.number}`;
      }
      return 'Một mondai';
    }
    case 'wrong':
      return 'Làm lại câu sai';
    default:
      return `Luyện theo dạng: ${attempt.mondaiType?.nameVi ?? ''}`.trim();
  }
}

export async function buildAttemptState(attempt: AttemptWithParts, now: Date) {
  const timed = isTimed(attempt.mode);
  const { byId, numbers } = await loadSections(attempt.sections.map((s) => s.sectionId));
  const snapshot = new Set(attempt.questionIds);
  const answers = new Map(attempt.answers.map((a) => [a.questionId, a]));

  // Lời giải ngay sau khi trả lời: chỉ ở chế độ không giới hạn giờ, chỉ với câu đã chấm.
  const graded = timed ? [] : attempt.answers.filter((a) => a.isCorrect !== null).map((a) => a.questionId);
  const gradedSet = new Set(graded);
  const gradedQuestions = [...byId.values()].flatMap((s) => s.mondai.flatMap((m) => m.questions)).filter((q) => gradedSet.has(q.id));
  const inReviews = await wordsInReviews(attempt.userId, gradedQuestions.map((q) => readExplanation(q.explanation)));

  const sections = attempt.sections.map((part) => {
    const section = byId.get(part.sectionId)!;
    const picked = pickMondai(section, snapshot);
    // Bấm giờ: chỉ gửi nội dung khi phần đang làm (đã bắt đầu, chưa nộp).
    const visible = !timed || (part.startedAt !== null && part.submittedAt === null);
    return {
      id: section.id,
      exam_id: section.exam.id,
      exam_title: section.exam.title,
      title: section.title,
      position: part.position,
      duration_minutes: timed ? section.durationMinutes : null,
      started_at: part.startedAt?.toISOString() ?? null,
      deadline_at: part.deadlineAt?.toISOString() ?? null,
      submitted_at: part.submittedAt?.toISOString() ?? null,
      question_count: picked.reduce((n, m) => n + m.questions.length, 0),
      mondai: visible
        ? picked.map(({ mondai, questions, passages }) => ({
            id: mondai.id,
            number: mondai.number,
            type_id: mondai.typeId,
            type_label_ja: mondai.type?.labelJa ?? null,
            type_name_vi: mondai.type?.nameVi ?? null,
            instructions: mondai.instructions,
            tip: timed ? null : mondai.tip,
            passages: passages.map((p) => toLearnerPassage(p, !timed)),
            questions: questions.map((q) => toLearnerQuestion(q, numbers.get(q.id)!)),
          }))
        : null,
    };
  });

  return {
    id: attempt.id,
    mode: attempt.mode,
    timed,
    status: attempt.status,
    scope_type: attempt.scopeType,
    scope_id: attempt.scopeId,
    scope_label: scopeLabel(attempt, byId),
    level: attempt.level,
    exam: attempt.exam,
    started_at: attempt.startedAt.toISOString(),
    submitted_at: attempt.submittedAt?.toISOString() ?? null,
    server_now: now.toISOString(),
    current_question_id: attempt.currentQuestionId,
    sections,
    answers: attempt.questionIds
      .map((id) => answers.get(id))
      .filter((a) => a !== undefined)
      .map((a) => ({ question_id: a.questionId, choice: a.choice, flagged: a.flagged, time_spent_ms: a.timeSpentMs })),
    feedback: gradedQuestions.map((q) => ({
      question_id: q.id,
      is_correct: answers.get(q.id)!.isCorrect === true,
      ...toSolution(q, inReviews),
    })),
  };
}

export async function getAttemptState(userId: string, attemptId: string, now = new Date()) {
  return buildAttemptState(await freshAttempt(userId, attemptId, now), now);
}

// ---------- Phần thi: bắt đầu, nộp ----------

/**
 * POST /attempts/:id/sections/:sectionId/start (FR-RUN-03). Thi thử trọn đề làm lần lượt: phần sau
 * chỉ bắt đầu được khi các phần trước đã nộp (FR-EXAM-04). Bắt đầu lại phần đã bắt đầu thì giữ
 * nguyên hạn nộp cũ (tải lại trang, đổi thiết bị không được thêm giờ).
 */
export async function startSection(userId: string, attemptId: string, sectionId: string, now = new Date()) {
  const attempt = await freshAttempt(userId, attemptId, now);
  if (attempt.status !== 'in_progress') throw alreadySubmitted();
  const part = attempt.sections.find((s) => s.sectionId === sectionId);
  if (!part) throw ApiError.notFound('Phần thi không thuộc lượt làm này');
  if (part.submittedAt) throw alreadySubmitted();
  if (!part.startedAt) {
    if (attempt.sections.some((s) => s.position < part.position && !s.submittedAt)) {
      throw ApiError.validation({ section_id: 'Nộp phần trước rồi mới bắt đầu phần này' });
    }
    const section = await prisma.examSection.findUniqueOrThrow({ where: { id: sectionId } });
    const minutes = section.durationMinutes ?? 0;
    await prisma.attemptSection.updateMany({
      where: { attemptId, sectionId, startedAt: null },
      data: {
        startedAt: now,
        deadlineAt: isTimed(attempt.mode) ? new Date(now.getTime() + minutes * 60_000) : null,
      },
    });
  }
  return buildAttemptState(await findOwnAttempt(userId, attemptId), now);
}

/** POST /attempts/:id/sections/:sectionId/submit (FR-RUN-12): nộp một phần trước giờ. */
export async function submitSection(userId: string, attemptId: string, sectionId: string, now = new Date()) {
  const attempt = await freshAttempt(userId, attemptId, now);
  const part = attempt.sections.find((s) => s.sectionId === sectionId);
  if (!part) throw ApiError.notFound('Phần thi không thuộc lượt làm này');
  if (attempt.status !== 'in_progress' || part.submittedAt) throw alreadySubmitted();
  if (!part.startedAt) throw ApiError.validation({ section_id: 'Phần thi chưa bắt đầu' });

  const done = await prisma.$transaction(async (tx) => {
    if (!(await closeSection(tx, attempt, sectionId, now))) throw alreadySubmitted();
    return completeIfDone(tx, attempt.id, now);
  });
  const next = attempt.sections.find((s) => s.position > part.position && !s.submittedAt);
  return { attempt_status: done ? 'submitted' : 'in_progress', next_section_id: done ? null : (next?.sectionId ?? null) };
}

/** POST /attempts/:id/finish: kết thúc lượt luyện không giới hạn giờ (nộp mọi phần còn mở). */
export async function finishAttempt(userId: string, attemptId: string, now = new Date()) {
  const attempt = await findOwnAttempt(userId, attemptId);
  if (isTimed(attempt.mode)) {
    throw ApiError.validation({ attempt: 'Lượt có bấm giờ phải nộp từng phần' });
  }
  if (attempt.status !== 'in_progress') throw alreadySubmitted();
  await prisma.$transaction(async (tx) => {
    for (const part of attempt.sections) if (!part.submittedAt) await closeSection(tx, attempt, part.sectionId, now);
    await completeIfDone(tx, attempt.id, now);
  });
  return { attempt_status: 'submitted' as const };
}

// ---------- Câu trả lời ----------

/**
 * PUT /attempts/:id/answers/:questionId (FR-RUN-04, 07). Ghi ngay lựa chọn, cờ xem lại, thời gian.
 * - Khóa dòng attempt_sections (FOR UPDATE): lưu và nộp cùng phần không chạy xen nhau.
 * - Sau hạn nộp → nộp phần đó rồi trả 409 SECTION_TIME_UP (NFR-EX-04), kể cả khi trình duyệt bị sửa.
 * - Bản gửi lại cũ hơn bản đã lưu (changed_at) không ghi đè lựa chọn và cờ.
 * - Chế độ luyện: lựa chọn đầu tiên được chấm ngay, trả kèm lời giải; câu đã chấm không đổi lựa chọn.
 */
export async function saveAnswer(userId: string, attemptId: string, questionId: string, input: AnswerInput, now = new Date()) {
  const attempt = await freshAttempt(userId, attemptId, now);
  if (!attempt.questionIds.includes(questionId)) throw ApiError.notFound('Câu hỏi không thuộc lượt làm này');
  const question = await prisma.question.findUnique({ where: { id: questionId }, include: { mondai: { select: { sectionId: true } } } });
  if (!question) throw ApiError.notFound('Câu hỏi không còn trong đề');
  const sectionId = question.mondai.sectionId;
  const timed = isTimed(attempt.mode);
  // Phần đã bị nộp tự động vì hết giờ (nộp đúng lúc hạn nộp) → báo hết giờ, không phải "đã nộp".
  const closed = attempt.sections.find((s) => s.sectionId === sectionId);
  if (closed?.submittedAt && closed.deadlineAt && closed.submittedAt.getTime() === closed.deadlineAt.getTime()) {
    throw timeUp();
  }
  if (attempt.status !== 'in_progress') throw alreadySubmitted();

  const outcome = await prisma.$transaction(async (tx) => {
    const [part] = await tx.$queryRaw<{ started_at: Date | null; deadline_at: Date | null; submitted_at: Date | null }[]>`
      SELECT started_at, deadline_at, submitted_at FROM attempt_sections
      WHERE attempt_id = ${attemptId} AND section_id = ${sectionId} FOR UPDATE`;
    if (!part) throw ApiError.notFound('Câu hỏi không thuộc lượt làm này');
    if (part.submitted_at) throw alreadySubmitted();
    if (!part.started_at) throw ApiError.validation({ section_id: 'Phần thi chưa bắt đầu' });
    if (timed && part.deadline_at && part.deadline_at <= now) return 'time_up' as const;

    const before = await tx.attemptAnswer.findUnique({ where: { attemptId_questionId: { attemptId, questionId } } });
    const changedAt = input.changed_at ? new Date(input.changed_at) : now;
    const stale = before?.clientChangedAt != null && changedAt < before.clientChangedAt;
    const locked = !timed && before?.isCorrect != null; // chế độ luyện: đã chấm thì giữ lựa chọn
    const choice = !stale && !locked && input.choice !== undefined ? input.choice : (before?.choice ?? null);
    const flagged = !stale && input.flagged !== undefined ? input.flagged : (before?.flagged ?? false);
    const timeSpentMs = Math.max(before?.timeSpentMs ?? 0, input.time_spent_ms ?? 0);
    const gradeNow = !timed && !locked && choice !== null;
    const isCorrect = gradeNow ? choice === question.correctOption : (before?.isCorrect ?? null);

    const saved = await tx.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: { attemptId, questionId, choice, flagged, timeSpentMs, isCorrect, clientChangedAt: stale ? undefined : changedAt },
      update: { choice, flagged, timeSpentMs, isCorrect, ...(stale ? {} : { clientChangedAt: changedAt }) },
    });
    if (gradeNow) {
      await updateWrongList(tx, userId, isCorrect ? { correct: [questionId], wrong: [] } : { correct: [], wrong: [questionId] }, now);
    }
    await tx.attempt.update({ where: { id: attemptId }, data: { currentQuestionId: questionId } });
    return saved;
  });

  if (outcome === 'time_up') {
    await finalizeExpired(await findOwnAttempt(userId, attemptId), now);
    throw timeUp();
  }

  let feedback = null;
  if (!timed && outcome.isCorrect !== null) {
    const inReviews = await wordsInReviews(userId, [readExplanation(question.explanation)]);
    feedback = { question_id: questionId, is_correct: outcome.isCorrect, ...toSolution(question, inReviews) };
  }
  return {
    answer: { question_id: questionId, choice: outcome.choice, flagged: outcome.flagged, time_spent_ms: outcome.timeSpentMs },
    feedback,
  };
}

/** PUT /attempts/:id/position: câu đang xem, để quay lại đúng chỗ (FR-RUN-05). */
export async function savePosition(userId: string, attemptId: string, questionId: string) {
  const attempt = await prisma.attempt.findFirst({ where: { id: attemptId, userId }, select: { status: true, questionIds: true } });
  if (!attempt) throw attemptNotFound();
  if (attempt.status !== 'in_progress') throw alreadySubmitted();
  if (!attempt.questionIds.includes(questionId)) throw ApiError.notFound('Câu hỏi không thuộc lượt làm này');
  await prisma.attempt.update({ where: { id: attemptId }, data: { currentQuestionId: questionId } });
}

export { findOwnAttempt, freshAttempt };
