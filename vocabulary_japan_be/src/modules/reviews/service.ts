import { env } from '../../config/env.ts';
import { prisma } from '../../db/prisma.ts';
import { endOfDay, toDateKey } from '../../domain/dates.ts';
import { applyGrade, type Quality } from '../../domain/srs.ts';
import type { Prisma } from '../../generated/prisma/client.ts';
import { toSrsState, toWordWithState } from '../../serializers/word.ts';
import { ApiError } from '../../utils/ApiError.ts';

/**
 * GET /reviews/due (prompt mục 5.3 + API_CONTRACT.md phụ lục A.1).
 * Cần ôn = từ có status ≠ new và due_at ≤ cuối ngày hôm nay (theo APP_TIMEZONE), quá hạn lâu nhất
 * trước. `total` là tổng số thẻ đến hạn (không bị cắt bởi limit). `next_due_at` là due_at sớm
 * nhất trong các thẻ chưa đến hạn hôm nay, để trang Ôn tập báo "Lần ôn tiếp theo".
 */
export async function getDueReviews(userId: string, limit: number, now = new Date()) {
  const dayEnd = endOfDay(now, env.APP_TIMEZONE);
  const dueWhere: Prisma.UserWordWhereInput = { userId, status: { not: 'new' }, dueAt: { lte: dayEnd } };

  const [total, rows, next] = await prisma.$transaction([
    prisma.userWord.count({ where: dueWhere }),
    prisma.userWord.findMany({
      where: dueWhere,
      include: { word: true },
      orderBy: [{ dueAt: 'asc' }, { wordId: 'asc' }],
      take: limit,
    }),
    prisma.userWord.findFirst({
      where: { userId, status: { not: 'new' }, dueAt: { gt: dayEnd } },
      orderBy: { dueAt: 'asc' },
      select: { dueAt: true },
    }),
  ]);

  return {
    items: rows.map((row) => toWordWithState(row.word, row)),
    total,
    next_due_at: next?.dueAt?.toISOString() ?? null,
  };
}

/**
 * POST /reviews/:wordId (prompt mục 3.2, 5.1). Trong một transaction:
 * 1. tạo bản ghi user_words nếu chưa có (trạng thái mặc định) rồi KHÓA dòng đó (SELECT … FOR
 *    UPDATE): hai lần chấm cùng một từ chạy song song (bấm đúp) phải xếp hàng, lần sau đọc trạng
 *    thái lần trước vừa ghi, nên không mất lượt chấm và chỉ có một log is_new = true;
 * 2. chạy SRS (domain/srs.ts, cùng hàm với mock frontend) theo APP_TIMEZONE;
 * 3. ghi user_words; lần chấm đầu tiên (chưa có first_learned_at) thì đặt first_learned_at;
 * 4. ghi một dòng review_logs với is_new và local_date theo APP_TIMEZONE.
 */
export async function gradeWord(userId: string, wordId: string, quality: Quality, now = new Date()) {
  const tz = env.APP_TIMEZONE;

  return prisma.$transaction(async (tx) => {
    const word = await tx.word.findUnique({ where: { id: wordId } });
    if (!word) throw ApiError.notFound('Không tìm thấy từ này');

    await tx.userWord.createMany({ data: [{ userId, wordId }], skipDuplicates: true });
    await tx.$queryRaw`SELECT 1 FROM user_words WHERE user_id = ${userId} AND word_id = ${wordId} FOR UPDATE`;
    const before = await tx.userWord.findUniqueOrThrow({ where: { userId_wordId: { userId, wordId } } });

    const isNew = !before.firstLearnedAt;
    const next = applyGrade(toSrsState(before), quality, now, tz);
    const userWord = await tx.userWord.update({
      where: { userId_wordId: { userId, wordId } },
      data: {
        status: next.status,
        ease: next.ease,
        intervalDays: next.interval_days,
        repetitions: next.repetitions,
        dueAt: next.due_at ? new Date(next.due_at) : null,
        lastReviewedAt: now,
        ...(isNew ? { firstLearnedAt: now } : {}),
      },
    });
    await tx.reviewLog.create({
      data: { userId, wordId, quality, isNew, reviewedAt: now, localDate: toDateKey(now, tz) },
    });
    return { word: toWordWithState(word, userWord) };
  });
}
