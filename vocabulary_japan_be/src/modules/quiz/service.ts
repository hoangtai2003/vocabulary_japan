import { randomUUID } from 'node:crypto';
import { prisma } from '../../db/prisma.ts';
import { buildQuestion, gradeQuiz, OPTIONS_PER_QUESTION, pickQuizWords } from '../../domain/quiz.ts';
import type { QuizQuestion, Word } from '../../domain/types.ts';
import { toWordJson, toWordWithState } from '../../serializers/word.ts';
import { ApiError } from '../../utils/ApiError.ts';
import type { StartQuizInput, SubmitQuizInput } from './schemas.ts';

/** Bài quiz hết hạn sau 2 giờ (prompt mục 3.2). */
export const QUIZ_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * POST /quiz/start (prompt mục 5.5). Kho từ là mọi từ thuộc cấp độ, kèm trạng thái của người dùng
 * để ưu tiên từ đã học. Tạo đề bằng domain/quiz.ts (giống mock frontend) rồi lưu cả bộ câu hỏi,
 * kèm đáp án đúng, vào quiz_sessions. Quiz không đổi dữ liệu SRS.
 */
export async function startQuiz(userId: string, input: StartQuizInput, now = new Date()) {
  const words = await prisma.word.findMany({
    where: { level: input.level },
    include: { userWords: { where: { userId }, take: 1 } },
  });
  if (words.length < OPTIONS_PER_QUESTION) {
    throw ApiError.validation({ level: `Cấp độ ${input.level} chưa đủ từ để làm quiz` });
  }

  const pool = words.map((w) => toWordWithState(w, w.userWords[0]));
  const quizId = randomUUID();
  const questions = pickQuizWords(pool, input.count).map((word, index) =>
    buildQuestion(word, pool, input.mode, `${quizId}_q${index + 1}`),
  );

  await prisma.quizSession.create({
    data: {
      id: quizId,
      userId,
      mode: input.mode,
      level: input.level,
      questions: questions as unknown as object,
      expiresAt: new Date(now.getTime() + QUIZ_TTL_MS),
    },
  });
  return { quiz_id: quizId, questions };
}

/**
 * POST /quiz/submit. Server tự chấm bằng bộ câu đã lưu, không tin kết quả gửi từ client.
 * - Quiz không tồn tại hoặc của người khác → 404.
 * - Đã hết hạn hoặc đã nộp → 400 VALIDATION_ERROR (không nộp lại được).
 * Đánh dấu đã nộp bằng một lệnh cập nhật có điều kiện (submitted_at IS NULL): hai lần nộp song
 * song thì chỉ một lần thành công.
 */
export async function submitQuiz(userId: string, input: SubmitQuizInput, now = new Date()) {
  const quiz = await prisma.quizSession.findFirst({ where: { id: input.quiz_id, userId } });
  if (!quiz) throw ApiError.notFound('Không tìm thấy bài quiz');
  if (quiz.expiresAt <= now) {
    throw ApiError.validation({ quiz_id: 'Bài quiz đã hết hạn. Làm bài mới nhé.' }, 'Bài quiz đã hết hạn');
  }

  const { count } = await prisma.quizSession.updateMany({
    where: { id: quiz.id, userId, submittedAt: null },
    data: { submittedAt: now },
  });
  if (count === 0) {
    throw ApiError.validation({ quiz_id: 'Bài quiz này đã được nộp. Làm bài mới nhé.' }, 'Bài quiz đã được nộp');
  }

  const questions = quiz.questions as unknown as QuizQuestion[];
  const words = await prisma.word.findMany({ where: { id: { in: questions.map((q) => q.word_id) } } });
  const wordsById = new Map<string, Word>(words.map((w) => [w.id, toWordJson(w)]));
  return gradeQuiz(questions, input.answers, wordsById);
}

/** Dọn quiz đã hết hạn (chạy cùng job dọn phiên đăng nhập). */
export async function deleteExpiredQuizzes(now = new Date()): Promise<number> {
  const { count } = await prisma.quizSession.deleteMany({ where: { expiresAt: { lte: now } } });
  return count;
}
