import { env } from '../../config/env.ts';
import { prisma } from '../../db/prisma.ts';
import { endOfDay, startOfDay, toDateKey } from '../../domain/dates.ts';
import { normalizeText } from '../../domain/normalize.ts';
import { selectTodayWords } from '../../domain/today.ts';
import type { WordWithState } from '../../domain/types.ts';
import type { Prisma, User } from '../../generated/prisma/client.ts';
import { toTopicJson, toWordWithState } from '../../serializers/word.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { escapeLike } from '../../utils/like.ts';
import { paginated, skipTake } from '../../utils/pagination.ts';
import type { ListWordsQuery } from './schemas.ts';

const TZ = () => env.APP_TIMEZONE;

/** Lấy kèm đúng một bản ghi user_words của người đang đăng nhập (không bao giờ của người khác). */
const withUserState = (userId: string) => ({ userWords: { where: { userId }, take: 1 } }) as const;

const notFound = () => ApiError.notFound('Không tìm thấy từ này');

/** Thứ tự danh sách: cấp độ (N5, N4, N3 — theo thứ tự khai báo enum), rồi chủ đề, rồi id. */
const WORD_ORDER: Prisma.WordOrderByWithRelationInput[] = [{ level: 'asc' }, { topicId: 'asc' }, { id: 'asc' }];

export async function listTopics() {
  const topics = await prisma.topic.findMany({ orderBy: { id: 'asc' } });
  return topics.map(toTopicJson);
}

/**
 * GET /words. Tìm q trong cột search_text (đã bỏ dấu, chữ thường) bằng ILIKE, sau khi chuẩn hóa
 * q giống hệt cách tạo search_text. Lọc status/favorite theo bản ghi user_words của chính người dùng;
 * status = new gồm cả từ chưa có bản ghi.
 */
export async function listWords(userId: string, query: ListWordsQuery) {
  const filters: Prisma.WordWhereInput[] = [];
  if (query.status === 'new') {
    filters.push({ NOT: { userWords: { some: { userId, status: { not: 'new' } } } } });
  } else if (query.status) {
    filters.push({ userWords: { some: { userId, status: query.status } } });
  }
  if (query.favorite) filters.push({ userWords: { some: { userId, isFavorite: true } } });
  // Prisma không escape ký tự đại diện của LIKE trong `contains`: tự escape % _ \ để
  // "%" hay "_" được tìm đúng nghĩa đen thay vì khớp mọi từ.
  const q = query.q ? escapeLike(normalizeText(query.q)) : '';

  const where: Prisma.WordWhereInput = {
    level: query.level,
    topicId: query.topic,
    ...(q ? { searchText: { contains: q, mode: 'insensitive' } } : {}),
    AND: filters,
  };

  const [total, words] = await prisma.$transaction([
    prisma.word.count({ where }),
    prisma.word.findMany({ where, orderBy: WORD_ORDER, include: withUserState(userId), ...skipTake(query) }),
  ]);
  return paginated(
    words.map((w) => toWordWithState(w, w.userWords[0])),
    query,
    total,
  );
}

export async function getWord(userId: string, wordId: string): Promise<WordWithState> {
  const word = await prisma.word.findUnique({ where: { id: wordId }, include: withUserState(userId) });
  if (!word) throw notFound();
  return toWordWithState(word, word.userWords[0]);
}

/**
 * Đặt yêu thích hoặc ghi chú. Tạo bản ghi user_words nếu chưa có (trạng thái SRS mặc định);
 * chỉ xem từ thì không tạo (prompt mục 3.2).
 */
async function updateUserWord(userId: string, wordId: string, data: { isFavorite?: boolean; note?: string }) {
  const word = await prisma.word.findUnique({ where: { id: wordId } });
  if (!word) throw notFound();
  const userWord = await prisma.userWord.upsert({
    where: { userId_wordId: { userId, wordId } },
    create: { userId, wordId, ...data },
    update: data,
  });
  return toWordWithState(word, userWord);
}

export const setFavorite = (userId: string, wordId: string, isFavorite: boolean) =>
  updateUserWord(userId, wordId, { isFavorite });

export const setNote = (userId: string, wordId: string, note: string) => updateUserWord(userId, wordId, { note });

/**
 * GET /words/today (prompt mục 3.2, 5.3).
 *
 * Lần gọi đầu tiên trong ngày (theo APP_TIMEZONE) chọn danh sách bằng selectTodayWords và lưu vào
 * daily_new_words; các lần sau trả lại đúng danh sách đó. Nếu người dùng đã đổi daily_goal hoặc
 * level giữa ngày, danh sách được tính lại, giữ các từ đã học hôm nay (API_CONTRACT.md phụ lục C,
 * giống mock frontend).
 *
 * learned_today = số từ trong danh sách có first_learned_at trong hôm nay.
 */
export async function getToday(user: User, now = new Date()) {
  const tz = TZ();
  const localDate = toDateKey(now, tz);
  const dayStart = startOfDay(now, tz);
  const dayEnd = endOfDay(now, tz);
  const level = user.level;
  const goal = user.dailyGoal;

  const learnedTodayIds = async (ids: string[]) => {
    if (ids.length === 0) return new Set<string>();
    const rows = await prisma.userWord.findMany({
      where: { userId: user.id, wordId: { in: ids }, firstLearnedAt: { gte: dayStart, lte: dayEnd } },
      select: { wordId: true },
    });
    return new Set(rows.map((r) => r.wordId));
  };

  let daily = await prisma.dailyNewWord.findUnique({ where: { userId_localDate: { userId: user.id, localDate } } });

  if (!daily || daily.goal !== goal || daily.level !== level) {
    const learned = daily ? await learnedTodayIds(daily.wordIds) : new Set<string>();
    const keepIds = daily ? daily.wordIds.filter((id) => learned.has(id)) : [];
    const candidates = await prisma.word.findMany({ where: { level }, include: withUserState(user.id) });
    const wordIds = selectTodayWords({
      words: candidates.map((w) => toWordWithState(w, w.userWords[0])),
      level,
      goal,
      keepIds,
    });
    // upsert: hai request đầu ngày chạy song song không tạo trùng; bản ghi sau cùng thắng.
    daily = await prisma.dailyNewWord.upsert({
      where: { userId_localDate: { userId: user.id, localDate } },
      create: { userId: user.id, localDate, wordIds, goal, level },
      update: { wordIds, goal, level },
    });
  }

  const words = await prisma.word.findMany({ where: { id: { in: daily.wordIds } }, include: withUserState(user.id) });
  const byId = new Map(words.map((w) => [w.id, w]));
  // Giữ đúng thứ tự đã chốt; bỏ qua từ đã bị admin xóa.
  const newWords = daily.wordIds.flatMap((id) => {
    const word = byId.get(id);
    return word ? [toWordWithState(word, word.userWords[0])] : [];
  });
  const learned = await learnedTodayIds(daily.wordIds);

  return { date: localDate, goal, new_words: newWords, learned_today: learned.size };
}
