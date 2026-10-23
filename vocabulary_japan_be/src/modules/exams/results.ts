import { prisma } from '../../db/prisma.ts';
import { scoreSummary } from '../../domain/exam.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { freshAttempt, isTimed } from './attempts.ts';
import { loadSections, pickMondai, toLearnerQuestion, toSolution, wordsInReviews } from './content.ts';
import { readExplanation, toPassageJson } from './tree.ts';

/**
 * GET /attempts/:id/result (FR-RES, FR-EXP): chỉ khi lượt đã nộp. Điểm tính lại từ is_correct đang
 * lưu (đã chấm lại nếu đáp án bị sửa, FR-RES-10). Đề bị ẩn vẫn xem lại được (DR-EX-15).
 */
export async function getAttemptResult(userId: string, attemptId: string, now = new Date()) {
  const attempt = await freshAttempt(userId, attemptId, now);
  if (attempt.status !== 'submitted') {
    throw ApiError.validation({ attempt: 'Nộp bài xong mới xem được kết quả' }, 'Lượt làm chưa nộp');
  }

  const { byId, numbers } = await loadSections(attempt.sections.map((s) => s.sectionId));
  const snapshot = new Set(attempt.questionIds);
  const answers = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const allQuestions = [...byId.values()].flatMap((s) => s.mondai.flatMap((m) => m.questions)).filter((q) => snapshot.has(q.id));
  const inReviews = await wordsInReviews(userId, allQuestions.map((q) => readExplanation(q.explanation)));

  const sections = attempt.sections.map((part) => {
    const section = byId.get(part.sectionId)!;
    const mondai = pickMondai(section, snapshot).map(({ mondai: m, questions, passages }) => {
      const items = questions.map((q) => {
        const answer = answers.get(q.id);
        return {
          ...toLearnerQuestion(q, numbers.get(q.id)!),
          ...toSolution(q, inReviews),
          chosen: answer?.choice ?? null,
          is_correct: answer?.isCorrect === true,
          flagged: answer?.flagged ?? false,
          time_spent_ms: answer?.timeSpentMs ?? 0,
        };
      });
      return {
        id: m.id,
        number: m.number,
        type_id: m.typeId,
        type_label_ja: m.type?.labelJa ?? null,
        type_name_vi: m.type?.nameVi ?? null,
        instructions: m.instructions,
        tip: m.tip,
        correct: items.filter((q) => q.is_correct).length,
        total: items.length,
        passages: passages.map((p) => {
          const { position: _position, ...rest } = toPassageJson(p);
          return rest;
        }),
        questions: items,
      };
    });
    const started = part.startedAt?.getTime();
    const ended = part.submittedAt && part.deadlineAt && part.submittedAt > part.deadlineAt ? part.deadlineAt : part.submittedAt;
    return {
      id: section.id,
      exam_id: section.exam.id,
      exam_title: section.exam.title,
      title: section.title,
      duration_minutes: isTimed(attempt.mode) ? section.durationMinutes : null,
      time_used_seconds: started !== undefined && ended ? Math.max(0, Math.round((ended.getTime() - started) / 1000)) : null,
      correct: mondai.reduce((n, m) => n + m.correct, 0),
      total: mondai.reduce((n, m) => n + m.total, 0),
      mondai,
    };
  });

  const correct = sections.reduce((n, s) => n + s.correct, 0);
  const total = sections.reduce((n, s) => n + s.total, 0);
  return {
    id: attempt.id,
    mode: attempt.mode,
    timed: isTimed(attempt.mode),
    scope_type: attempt.scopeType,
    scope_id: attempt.scopeId,
    level: attempt.level,
    exam: attempt.exam,
    started_at: attempt.startedAt.toISOString(),
    submitted_at: attempt.submittedAt!.toISOString(),
    regraded_at: attempt.regradedAt?.toISOString() ?? null,
    correct,
    total,
    // Điểm ước tính chỉ có nghĩa khi làm cả đề (FR-RES-03).
    score: attempt.scopeType === 'exam' ? scoreSummary(attempt.level, correct, total) : null,
    sections,
  };
}

/** Lượt làm của một người với một đề (FR-RES-09): đã nộp và đang làm dở, mới nhất trước. */
export async function listExamAttempts(userId: string, examId: string) {
  const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { id: true } });
  if (!exam) throw ApiError.notFound('Không tìm thấy đề');
  const attempts = await prisma.attempt.findMany({
    where: { userId, examId, status: { in: ['submitted', 'in_progress'] } },
    orderBy: { startedAt: 'desc' },
    include: { sections: { select: { sectionId: true, section: { select: { title: true } } } } },
  });
  const mondai = await prisma.mondai.findMany({
    where: { id: { in: attempts.filter((a) => a.scopeType === 'mondai').map((a) => a.scopeId!) } },
    include: { section: { select: { title: true } } },
  });
  const mondaiLabel = new Map(mondai.map((m) => [m.id, `${m.section.title} · 問題${m.number}`]));
  return attempts.map((a) => ({
    id: a.id,
    mode: a.mode,
    status: a.status,
    scope_type: a.scopeType,
    scope_id: a.scopeId,
    scope_label:
      a.scopeType === 'exam'
        ? 'Cả đề'
        : a.scopeType === 'section'
          ? (a.sections[0]?.section.title ?? 'Một phần thi')
          : (mondaiLabel.get(a.scopeId ?? '') ?? 'Một mondai'),
    started_at: a.startedAt.toISOString(),
    submitted_at: a.submittedAt?.toISOString() ?? null,
    correct: a.correctCount,
    total: a.totalCount,
    estimated_score:
      a.status === 'submitted' && a.scopeType === 'exam'
        ? (scoreSummary(a.level, a.correctCount ?? 0, a.totalCount)?.estimated_score ?? null)
        : null,
    regraded: a.regradedAt !== null,
  }));
}
