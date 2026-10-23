import { prisma } from '../../db/prisma.ts';
import { scoreSummary } from '../../domain/exam.ts';
import type { JlptLevel } from '../../domain/types.ts';
import { ApiError } from '../../utils/ApiError.ts';

/** Danh sách và chi tiết đề cho người học (FR-EXAM-01 đến 03): chỉ đề Đã xuất bản (FR-EXAM-02). */

const structureInclude = {
  sections: {
    orderBy: { position: 'asc' as const },
    include: {
      mondai: {
        orderBy: { position: 'asc' as const },
        include: { type: { select: { labelJa: true, nameVi: true } }, _count: { select: { questions: true } } },
      },
    },
  },
};

/** GET /exams?level=: kèm số câu, tổng thời gian, kết quả thi thử tốt nhất và lượt đang làm dở. */
export async function listPublishedExams(userId: string, level?: JlptLevel) {
  const exams = await prisma.exam.findMany({
    where: { status: 'published', level },
    include: structureInclude,
    orderBy: [{ level: 'asc' }, { publishedAt: 'asc' }, { title: 'asc' }],
  });
  const attempts = await prisma.attempt.findMany({
    where: { userId, examId: { in: exams.map((e) => e.id) }, status: { in: ['submitted', 'in_progress'] } },
    select: { id: true, examId: true, status: true, scopeType: true, correctCount: true, totalCount: true, submittedAt: true, level: true },
  });

  return exams.map((exam) => {
    const mine = attempts.filter((a) => a.examId === exam.id);
    const full = mine.filter((a) => a.status === 'submitted' && a.scopeType === 'exam' && a.totalCount > 0);
    const best = full.reduce<(typeof full)[number] | null>(
      (top, a) => (!top || (a.correctCount ?? 0) / a.totalCount > (top.correctCount ?? 0) / top.totalCount ? a : top),
      null,
    );
    return {
      id: exam.id,
      title: exam.title,
      level: exam.level,
      difficulty: exam.difficulty,
      description: exam.description,
      question_count: exam.sections.reduce((n, s) => n + s.mondai.reduce((k, m) => k + m._count.questions, 0), 0),
      total_minutes: exam.sections.reduce((n, s) => n + (s.durationMinutes ?? 0), 0),
      best: best
        ? {
            attempt_id: best.id,
            correct: best.correctCount ?? 0,
            total: best.totalCount,
            estimated_score: scoreSummary(best.level, best.correctCount ?? 0, best.totalCount)?.estimated_score ?? null,
            submitted_at: best.submittedAt!.toISOString(),
          }
        : null,
      in_progress_attempt_id: mine.find((a) => a.status === 'in_progress')?.id ?? null,
    };
  });
}

/** GET /exams/:id: cấu trúc đề (phần thi, mondai, số câu, thời gian), không kèm câu hỏi hay đáp án. */
export async function getPublishedExam(userId: string, id: string) {
  const exam = await prisma.exam.findFirst({ where: { id, status: 'published' }, include: structureInclude });
  if (!exam) throw ApiError.notFound('Không tìm thấy đề');
  const inProgress = await prisma.attempt.findFirst({
    where: { userId, examId: id, status: 'in_progress' },
    select: { id: true, mode: true, scopeType: true, scopeId: true, startedAt: true },
  });
  const sections = exam.sections.map((s) => ({
    id: s.id,
    title: s.title,
    kind: s.kind,
    duration_minutes: s.durationMinutes,
    question_count: s.mondai.reduce((n, m) => n + m._count.questions, 0),
    mondai: s.mondai.map((m) => ({
      id: m.id,
      number: m.number,
      type_id: m.typeId,
      type_label_ja: m.type?.labelJa ?? null,
      type_name_vi: m.type?.nameVi ?? null,
      question_count: m._count.questions,
    })),
  }));
  return {
    id: exam.id,
    title: exam.title,
    level: exam.level,
    difficulty: exam.difficulty,
    description: exam.description,
    instructions: exam.instructions,
    question_count: sections.reduce((n, s) => n + s.question_count, 0),
    total_minutes: sections.reduce((n, s) => n + (s.duration_minutes ?? 0), 0),
    sections,
    in_progress: inProgress
      ? {
          attempt_id: inProgress.id,
          mode: inProgress.mode,
          scope_type: inProgress.scopeType,
          scope_id: inProgress.scopeId,
          started_at: inProgress.startedAt.toISOString(),
        }
      : null,
  };
}
