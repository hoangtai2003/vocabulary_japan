import { prisma } from '../../db/prisma.ts';
import { scoreSummary } from '../../domain/exam.ts';
import { plainText } from '../../domain/markup.ts';
import { shuffle } from '../../domain/random.ts';
import type { JlptLevel } from '../../domain/types.ts';
import { toWordWithState } from '../../serializers/word.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { createLooseAttempt } from './attempts.ts';
import { questionNumbers } from './tree.ts';

/**
 * Luyện tập ngoài thi thử (SRS 2.0, giai đoạn 2c): làm lại câu sai (FR-EXAM-07), luyện theo dạng
 * (FR-EXAM-08), thống kê luyện đề cho trang Tiến độ (FR-EXP-08, 09), đưa từ trong lời giải vào lịch
 * ôn (FR-EXP-07). Chỉ dùng câu của đề đang xuất bản.
 */

const questionContext = {
  mondai: {
    select: {
      number: true,
      typeId: true,
      type: { select: { nameVi: true, labelJa: true } },
      section: { select: { id: true, title: true, position: true, exam: { select: { id: true, title: true, level: true, status: true } } } },
    },
  },
} as const;

/** Số câu theo đề gốc cho các phần thi có liên quan. */
async function numbersFor(sectionIds: string[]) {
  const sections = await prisma.examSection.findMany({
    where: { id: { in: sectionIds } },
    include: { mondai: { orderBy: { position: 'asc' }, include: { questions: { orderBy: { position: 'asc' } } } } },
  });
  return questionNumbers({ sections: sections as Parameters<typeof questionNumbers>[0]['sections'] });
}

/**
 * GET /practice/mondai-types?level=: dạng mondai có câu trong các đề đã xuất bản (để chọn khi luyện
 * theo dạng, FR-EXAM-08), kèm số câu hiện có.
 */
export async function listPracticeTypes(level?: JlptLevel) {
  const types = await prisma.mondaiType.findMany({
    where: { level },
    orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    include: {
      mondai: {
        where: { section: { exam: { status: 'published' } } },
        select: { _count: { select: { questions: true } } },
      },
    },
  });
  return types
    .map((t) => ({
      id: t.id,
      level: t.level,
      section_title: t.sectionTitle,
      label_ja: t.labelJa,
      name_vi: t.nameVi,
      has_passage: t.hasPassage,
      question_count: t.mondai.reduce((n, m) => n + m._count.questions, 0),
    }))
    .filter((t) => t.question_count > 0);
}

/** GET /practice/wrong-questions: danh sách câu cần làm lại, mới sai gần nhất trước. */
export async function listWrongQuestions(userId: string) {
  const rows = await prisma.wrongQuestion.findMany({
    where: { userId, question: { mondai: { section: { exam: { status: 'published' } } } } },
    include: { question: { include: questionContext } },
    orderBy: { lastWrongAt: 'desc' },
  });
  const numbers = await numbersFor([...new Set(rows.map((r) => r.question.mondai.section.id))]);
  return {
    total: rows.length,
    items: rows.map((r) => {
      const q = r.question;
      const prompt = q.kind === 'star' ? `${q.starPrefix} ＿＿ ＿★＿ ＿＿ ＿＿ ${q.starSuffix}` : q.prompt;
      return {
        question_id: q.id,
        exam_id: q.mondai.section.exam.id,
        exam_title: q.mondai.section.exam.title,
        level: q.mondai.section.exam.level,
        section_title: q.mondai.section.title,
        mondai_number: q.mondai.number,
        type_id: q.mondai.typeId,
        type_name_vi: q.mondai.type?.nameVi ?? null,
        number: numbers.get(q.id) ?? null,
        prompt_preview: plainText(prompt).replace(/\s+/g, ' ').slice(0, 120),
        correct_streak: r.correctStreak,
        last_wrong_at: r.lastWrongAt.toISOString(),
      };
    }),
  };
}

type Candidate = {
  id: string;
  passageId: string | null;
  position: number;
  mondai: { position: number; sectionId: string; section: { position: number; examId: string } };
};

/** Sắp câu theo thứ tự trong đề gốc (đề → phần → mondai → câu), để lượt luyện đọc tự nhiên. */
const byExamOrder = (a: Candidate, b: Candidate) =>
  a.mondai.section.examId.localeCompare(b.mondai.section.examId) ||
  a.mondai.section.position - b.mondai.section.position ||
  a.mondai.position - b.mondai.position ||
  a.position - b.position;

const candidateSelect = {
  id: true,
  passageId: true,
  position: true,
  mondai: { select: { position: true, sectionId: true, section: { select: { position: true, examId: true } } } },
} as const;

/** POST /practice/wrong-questions: tạo lượt làm lại câu sai (không giới hạn giờ). */
export async function startWrongReview(userId: string, input: { level?: JlptLevel; limit: number }) {
  const rows = await prisma.wrongQuestion.findMany({
    where: {
      userId,
      question: { mondai: { section: { exam: { status: 'published', ...(input.level ? { level: input.level } : {}) } } } },
    },
    orderBy: { lastWrongAt: 'desc' },
    take: input.limit,
    include: { question: { select: candidateSelect } },
  });
  if (rows.length === 0) throw ApiError.validation({ level: 'Chưa có câu nào cần làm lại' }, 'Chưa có câu nào cần làm lại');
  const levelRow = await prisma.exam.findUniqueOrThrow({
    where: { id: rows[0]!.question.mondai.section.examId },
    select: { level: true },
  });
  const questions = rows.map((r) => r.question).sort(byExamOrder);
  return createLooseAttempt(
    userId,
    { mode: 'wrong_review', scopeType: 'wrong', scopeId: null, level: input.level ?? levelRow.level, mondaiTypeId: null },
    questions.map((q) => ({ id: q.id, sectionId: q.mondai.sectionId })),
  );
}

/**
 * POST /practice/by-type (FR-EXAM-08): lấy ngẫu nhiên câu cùng dạng từ mọi đề đã xuất bản cùng cấp.
 * Dạng có bài đọc thì lấy trọn từng bài đọc (không tách câu khỏi bài), tới khi đủ số câu.
 */
export async function startByType(userId: string, input: { level: JlptLevel; mondai_type: string; count: number }) {
  const type = await prisma.mondaiType.findUnique({ where: { id: input.mondai_type } });
  if (!type || type.level !== input.level) throw ApiError.validation({ mondai_type: 'Dạng mondai không có ở cấp độ này' });
  const pool = await prisma.question.findMany({
    where: { mondai: { typeId: type.id, section: { exam: { status: 'published', level: input.level } } } },
    select: candidateSelect,
  });
  if (pool.length === 0) throw ApiError.validation({ mondai_type: 'Chưa có câu nào của dạng này trong các đề đã xuất bản' });

  const groups = new Map<string, Candidate[]>();
  for (const q of pool) {
    const key = q.passageId ?? q.id;
    groups.set(key, [...(groups.get(key) ?? []), q]);
  }
  const picked: Candidate[] = [];
  for (const group of shuffle([...groups.values()])) {
    if (picked.length >= input.count) break;
    picked.push(...group);
  }
  picked.sort(byExamOrder);
  return createLooseAttempt(
    userId,
    { mode: 'by_type', scopeType: 'by_type', scopeId: type.id, level: input.level, mondaiTypeId: type.id },
    picked.map((q) => ({ id: q.id, sectionId: q.mondai.sectionId })),
  );
}

/**
 * GET /stats/exams (FR-EXP-08, 09):
 * - điểm ước tính qua các lượt thi thử trọn đề, theo thời gian;
 * - theo dạng mondai trên toàn bộ câu đã chấm: tỷ lệ đúng (thấp đến cao), thời gian trung bình mỗi
 *   câu và thời gian chuẩn (thời gian phần thi ÷ số câu của phần).
 */
export async function getExamStats(userId: string) {
  const attempts = await prisma.attempt.findMany({
    where: { userId, status: 'submitted', mode: 'exam', scopeType: 'exam' },
    orderBy: { submittedAt: 'asc' },
    include: { exam: { select: { id: true, title: true } } },
  });

  const rows = await prisma.$queryRaw<
    { type_id: string; answered: bigint; correct: bigint; avg_time: number | null; std_time: number | null }[]
  >`
    WITH section_counts AS (
      SELECT m.section_id, COUNT(q.id)::float AS n FROM questions q JOIN mondai m ON m.id = q.mondai_id GROUP BY m.section_id
    )
    SELECT m.type_id,
           COUNT(*) AS answered,
           COUNT(*) FILTER (WHERE a.is_correct) AS correct,
           AVG(NULLIF(a.time_spent_ms, 0))::float AS avg_time,
           AVG(s.duration_minutes * 60000.0 / sc.n)::float AS std_time
    FROM attempt_answers a
    JOIN attempts t ON t.id = a.attempt_id
    JOIN questions q ON q.id = a.question_id
    JOIN mondai m ON m.id = q.mondai_id
    JOIN exam_sections s ON s.id = m.section_id
    JOIN section_counts sc ON sc.section_id = s.id
    WHERE t.user_id = ${userId} AND a.is_correct IS NOT NULL AND m.type_id IS NOT NULL
    GROUP BY m.type_id`;
  const types = await prisma.mondaiType.findMany({ where: { id: { in: rows.map((r) => r.type_id) } } });
  const typeById = new Map(types.map((t) => [t.id, t]));

  return {
    attempts: attempts.map((a) => ({
      attempt_id: a.id,
      exam_id: a.exam?.id ?? null,
      exam_title: a.exam?.title ?? '',
      level: a.level,
      submitted_at: a.submittedAt!.toISOString(),
      correct: a.correctCount ?? 0,
      total: a.totalCount,
      estimated_score: scoreSummary(a.level, a.correctCount ?? 0, a.totalCount)?.estimated_score ?? null,
    })),
    by_type: rows
      .map((r) => {
        const type = typeById.get(r.type_id);
        const answered = Number(r.answered);
        const correct = Number(r.correct);
        return {
          type_id: r.type_id,
          level: type?.level ?? null,
          label_ja: type?.labelJa ?? r.type_id,
          name_vi: type?.nameVi ?? r.type_id,
          answered,
          correct,
          accuracy: answered > 0 ? correct / answered : 0,
          avg_time_ms: r.avg_time === null ? null : Math.round(r.avg_time),
          standard_time_ms: r.std_time === null ? null : Math.round(r.std_time),
        };
      })
      .sort((a, b) => a.accuracy - b.accuracy || b.answered - a.answered),
  };
}

/**
 * POST /reviews/from-explanation (FR-EXP-07): đưa một từ trong lời giải vào lịch ôn với trạng thái
 * Đang học, đến hạn ngay hôm nay. Từ đã có trong lịch ôn (status ≠ new) thì giữ nguyên.
 */
export async function addWordFromExplanation(userId: string, wordId: string, now = new Date()) {
  const word = await prisma.word.findUnique({ where: { id: wordId } });
  if (!word) throw ApiError.notFound('Không tìm thấy từ này');
  const existing = await prisma.userWord.findUnique({ where: { userId_wordId: { userId, wordId } } });
  if (existing && existing.status !== 'new') {
    return { word: toWordWithState(word, existing), already_in_reviews: true };
  }
  const dueAt = now;
  const userWord = await prisma.userWord.upsert({
    where: { userId_wordId: { userId, wordId } },
    create: { userId, wordId, status: 'learning', dueAt },
    update: { status: 'learning', dueAt },
  });
  return { word: toWordWithState(word, userWord), already_in_reviews: false };
}
