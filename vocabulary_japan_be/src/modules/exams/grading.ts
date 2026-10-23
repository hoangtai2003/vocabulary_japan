import { prisma } from '../../db/prisma.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

type Tx = Prisma.TransactionClient;

/**
 * Chấm các câu của một phần vừa nộp (FR-RES-01): so lựa chọn đã lưu với đáp án đúng đang có trong
 * DB, không dùng dữ liệu trình duyệt gửi lên. Câu chưa trả lời không có dòng attempt_answers, nên
 * không bị chấm (và không vào danh sách câu sai). Trả về id các câu đúng và sai.
 */
export async function gradeAnswers(tx: Tx, attemptId: string, questionIds: string[]) {
  const answers = await tx.attemptAnswer.findMany({
    where: { attemptId, questionId: { in: questionIds }, choice: { not: null } },
    include: { question: { select: { correctOption: true } } },
  });
  const correct: string[] = [];
  const wrong: string[] = [];
  for (const answer of answers) {
    (answer.choice === answer.question.correctOption ? correct : wrong).push(answer.questionId);
  }
  if (correct.length > 0) {
    await tx.attemptAnswer.updateMany({ where: { attemptId, questionId: { in: correct } }, data: { isCorrect: true } });
  }
  if (wrong.length > 0) {
    await tx.attemptAnswer.updateMany({ where: { attemptId, questionId: { in: wrong } }, data: { isCorrect: false } });
  }
  return { correct, wrong };
}

/**
 * Tính lại số câu đúng/tổng của lượt làm từ bộ câu đã chốt (câu bị xóa khỏi đề thì không tính).
 */
export async function recountAttempt(tx: Tx, attemptId: string) {
  const attempt = await tx.attempt.findUniqueOrThrow({ where: { id: attemptId }, select: { questionIds: true } });
  const [total, correct] = await Promise.all([
    tx.question.count({ where: { id: { in: attempt.questionIds } } }),
    tx.attemptAnswer.count({ where: { attemptId, isCorrect: true } }),
  ]);
  await tx.attempt.update({ where: { id: attemptId }, data: { totalCount: total, correctCount: correct } });
}

/**
 * Danh sách câu cần làm lại (DR-EX-16, FR-EXAM-07): câu sai vào danh sách (đặt lại chuỗi đúng về 0);
 * câu đúng đang có trong danh sách thì tăng chuỗi, đúng 2 lần liên tiếp thì rời danh sách.
 */
export const WRONG_STREAK_TO_CLEAR = 2;

export async function updateWrongList(tx: Tx, userId: string, result: { correct: string[]; wrong: string[] }, now: Date) {
  for (const questionId of result.wrong) {
    await tx.wrongQuestion.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: { userId, questionId, lastWrongAt: now },
      update: { correctStreak: 0, lastWrongAt: now },
    });
  }
  if (result.correct.length === 0) return;
  await tx.wrongQuestion.updateMany({
    where: { userId, questionId: { in: result.correct } },
    data: { correctStreak: { increment: 1 } },
  });
  await tx.wrongQuestion.deleteMany({
    where: { userId, questionId: { in: result.correct }, correctStreak: { gte: WRONG_STREAK_TO_CLEAR } },
  });
}

/**
 * Chấm lại mọi câu trả lời đã chấm của một câu hỏi sau khi quản trị viên sửa đáp án đúng
 * (FR-RES-10). Lượt nào đổi kết quả thì đếm lại điểm và ghi regraded_at để màn hình kết quả báo
 * "Đề đã được cập nhật sau lần làm này". Chạy nền (NFR-EX-09). Trả về số lượt bị ảnh hưởng.
 */
export async function regradeQuestion(questionId: string, now = new Date()): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const question = await tx.question.findUnique({ where: { id: questionId }, select: { correctOption: true } });
    if (!question) return 0;
    const answers = await tx.attemptAnswer.findMany({
      where: { questionId, isCorrect: { not: null } },
      select: { attemptId: true, choice: true, isCorrect: true },
    });
    const changed = answers.filter((a) => (a.choice !== null && a.choice === question.correctOption) !== a.isCorrect);
    for (const answer of changed) {
      await tx.attemptAnswer.update({
        where: { attemptId_questionId: { attemptId: answer.attemptId, questionId } },
        data: { isCorrect: !answer.isCorrect },
      });
    }
    const attemptIds = [...new Set(answers.map((a) => a.attemptId))];
    for (const attemptId of attemptIds) await recountAttempt(tx, attemptId);
    if (attemptIds.length > 0) {
      await tx.attempt.updateMany({ where: { id: { in: attemptIds }, status: 'submitted' }, data: { regradedAt: now } });
    }
    return attemptIds.length;
  });
}

/** Số lượt đã nộp (hoặc đã chấm ở chế độ luyện) có trả lời câu này — để hỏi xác nhận (FR-CMS-16). */
export async function gradedAttemptCount(questionId: string): Promise<number> {
  const rows = await prisma.attemptAnswer.findMany({
    where: { questionId, isCorrect: { not: null } },
    select: { attemptId: true },
    distinct: ['attemptId'],
  });
  return rows.length;
}
