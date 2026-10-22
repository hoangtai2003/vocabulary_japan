import { env } from '../../config/env.ts';
import { prisma } from '../../db/prisma.ts';
import { addDays, diffInCalendarDays, endOfDay, isDateKey, parseDateKey, startOfWeek, toDateKey } from '../../domain/dates.ts';
import { computeStreak } from '../../domain/streak.ts';
import type { User } from '../../generated/prisma/client.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { MAX_CALENDAR_DAYS } from './schemas.ts';

/**
 * Thống kê (prompt mục 5.4). Mọi con số tính bằng truy vấn gộp trong PostgreSQL (count, groupBy
 * theo local_date / is_new), không tải từng dòng review_logs lên bộ nhớ. Ngày, tuần theo APP_TIMEZONE.
 */

/** GET /stats/overview */
export async function getOverview(user: User, now = new Date()) {
  const tz = env.APP_TIMEZONE;
  const todayKey = toDateKey(now, tz);
  const dayEnd = endOfDay(now, tz);

  const [activeDays, totalLearned, mastered, dueToday, todayCounts] = await prisma.$transaction([
    // Các ngày có ít nhất 1 lượt chấm (DISTINCT local_date) — đủ để tính streak.
    prisma.reviewLog.findMany({ where: { userId: user.id }, distinct: ['localDate'], select: { localDate: true } }),
    prisma.userWord.count({ where: { userId: user.id, firstLearnedAt: { not: null } } }),
    prisma.userWord.count({ where: { userId: user.id, status: 'mastered' } }),
    prisma.userWord.count({ where: { userId: user.id, status: { not: 'new' }, dueAt: { lte: dayEnd } } }),
    prisma.reviewLog.groupBy({
      by: ['isNew'],
      where: { userId: user.id, localDate: todayKey },
      _count: { _all: true },
      orderBy: { isNew: 'asc' },
    }),
  ]);

  const streak = computeStreak(
    activeDays.map((d) => d.localDate),
    now,
    tz,
  );
  const countToday = (isNew: boolean) => {
    const row = todayCounts.find((r) => r.isNew === isNew);
    return typeof row?._count === 'object' ? (row._count._all ?? 0) : 0;
  };

  return {
    streak_days: streak.current,
    longest_streak: streak.longest,
    total_learned: totalLearned,
    mastered,
    due_today: dueToday,
    today: {
      new_learned: countToday(true),
      reviewed: countToday(false),
      goal: user.dailyGoal,
    },
  };
}

/** Đếm lượt chấm theo (local_date, is_new) trong khoảng ngày, do PostgreSQL gộp sẵn. */
async function countsByDate(userId: string, from: string, to: string) {
  const rows = await prisma.reviewLog.groupBy({
    by: ['localDate', 'isNew'],
    where: { userId, localDate: { gte: from, lte: to } },
    _count: { _all: true },
    orderBy: { localDate: 'asc' },
  });
  return rows.map((r) => ({
    localDate: r.localDate,
    isNew: r.isNew,
    count: typeof r._count === 'object' ? (r._count._all ?? 0) : 0,
  }));
}

/**
 * GET /stats/weekly. `weeks` tuần gần nhất, tuần bắt đầu thứ Hai, tăng dần và kết thúc ở tuần
 * hiện tại; tuần không có lượt chấm vẫn có mặt với số 0.
 */
export async function getWeekly(userId: string, weeks: number, now = new Date()) {
  const tz = env.APP_TIMEZONE;
  const currentWeek = startOfWeek(now, tz);
  const result = Array.from({ length: weeks }, (_, i) => ({
    week_start: toDateKey(addDays(currentWeek, -7 * (weeks - 1 - i), tz), tz),
    new_learned: 0,
    reviewed: 0,
  }));
  const byStart = new Map(result.map((w) => [w.week_start, w]));
  const first = result[0]?.week_start ?? toDateKey(currentWeek, tz);

  for (const row of await countsByDate(userId, first, toDateKey(now, tz))) {
    const week = byStart.get(toDateKey(startOfWeek(parseDateKey(row.localDate, tz), tz), tz));
    if (!week) continue;
    if (row.isNew) week.new_learned += row.count;
    else week.reviewed += row.count;
  }
  return { weeks: result };
}

/**
 * GET /stats/calendar. from, to dạng YYYY-MM-DD, tính cả hai đầu, tối đa 366 ngày. Chỉ trả những
 * ngày có lượt chấm; count = tổng lượt chấm trong ngày.
 */
export async function getCalendar(userId: string, from: string, to: string) {
  const tz = env.APP_TIMEZONE;
  const fields: Record<string, string> = {};
  if (!isDateKey(from, tz)) fields.from = 'Ngày bắt đầu phải có dạng YYYY-MM-DD';
  if (!isDateKey(to, tz)) fields.to = 'Ngày kết thúc phải có dạng YYYY-MM-DD';
  if (!fields.from && !fields.to) {
    const span = diffInCalendarDays(parseDateKey(to, tz), parseDateKey(from, tz), tz) + 1;
    if (span < 1) fields.from = 'Ngày bắt đầu phải trước ngày kết thúc';
    else if (span > MAX_CALENDAR_DAYS) fields.to = `Khoảng thời gian tối đa ${MAX_CALENDAR_DAYS} ngày`;
  }
  if (Object.keys(fields).length > 0) throw ApiError.validation(fields);

  const totals = new Map<string, number>();
  for (const row of await countsByDate(userId, from, to)) {
    totals.set(row.localDate, (totals.get(row.localDate) ?? 0) + row.count);
  }
  return { days: [...totals].map(([date, count]) => ({ date, count })) };
}
