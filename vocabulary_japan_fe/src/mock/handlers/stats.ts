import { addDays, isDateKey, parseDateKey, startOfWeek, toDateKey } from '@/utils/dates';
import { computeStreak } from '@/utils/streak';
import { readDb } from '../db';
import type { MockDb } from '../types';
import { api, errors, handle, http, HttpResponse, intParam, requireUser } from './http';
import { dueWords, userStates } from './shared';

/** Tối đa số ngày cho một lần gọi /stats/calendar. */
const MAX_CALENDAR_DAYS = 400;

function userLogs(db: MockDb, userId: string) {
  return db.reviews.filter((r) => r.user_id === userId);
}

export const statsHandlers = [
  http.get(
    api('/stats/overview'),
    handle(() => {
      const db = readDb();
      const user = requireUser(db);
      const now = new Date();
      const todayKey = toDateKey(now);
      const logs = userLogs(db, user.id);
      const states = Object.values(userStates(db, user.id));
      const streak = computeStreak(
        logs.map((r) => toDateKey(new Date(r.reviewed_at))),
        now,
      );
      const todayLogs = logs.filter((r) => toDateKey(new Date(r.reviewed_at)) === todayKey);

      return HttpResponse.json({
        streak_days: streak.current,
        longest_streak: streak.longest,
        total_learned: states.filter((s) => s.status !== 'new').length,
        mastered: states.filter((s) => s.status === 'mastered').length,
        due_today: dueWords(db, user.id, now).length,
        today: {
          new_learned: new Set(todayLogs.filter((r) => r.was_new).map((r) => r.word_id)).size,
          reviewed: todayLogs.filter((r) => !r.was_new).length,
          goal: user.settings.daily_goal,
        },
      });
    }),
  ),

  http.get(
    api('/stats/weekly'),
    handle(({ request }) => {
      const db = readDb();
      const user = requireUser(db);
      const weeksCount = intParam(new URL(request.url), 'weeks', 8, 52);
      const currentWeek = startOfWeek(new Date());

      const weeks = Array.from({ length: weeksCount }, (_, i) => ({
        week_start: toDateKey(addDays(currentWeek, -7 * (weeksCount - 1 - i))),
        new_learned: 0,
        reviewed: 0,
      }));
      const byStart = new Map(weeks.map((w) => [w.week_start, w]));

      for (const log of userLogs(db, user.id)) {
        const week = byStart.get(toDateKey(startOfWeek(new Date(log.reviewed_at))));
        if (!week) continue;
        if (log.was_new) week.new_learned += 1;
        else week.reviewed += 1;
      }
      return HttpResponse.json({ weeks });
    }),
  ),

  http.get(
    api('/stats/calendar'),
    handle(({ request }) => {
      const db = readDb();
      const user = requireUser(db);
      const url = new URL(request.url);
      const from = url.searchParams.get('from') ?? '';
      const to = url.searchParams.get('to') ?? '';

      const fields: Record<string, string> = {};
      if (!isDateKey(from)) fields.from = 'Ngày bắt đầu phải có dạng YYYY-MM-DD';
      if (!isDateKey(to)) fields.to = 'Ngày kết thúc phải có dạng YYYY-MM-DD';
      if (!fields.from && !fields.to) {
        if (from > to) fields.from = 'Ngày bắt đầu phải trước ngày kết thúc';
        else if (addDays(parseDateKey(from), MAX_CALENDAR_DAYS) < parseDateKey(to)) {
          fields.to = `Khoảng thời gian tối đa ${MAX_CALENDAR_DAYS} ngày`;
        }
      }
      if (Object.keys(fields).length > 0) throw errors.validation(fields);

      const counts = new Map<string, number>();
      for (const log of userLogs(db, user.id)) {
        const key = toDateKey(new Date(log.reviewed_at));
        if (key >= from && key <= to) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const days = [...counts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));
      return HttpResponse.json({ days });
    }),
  ),
];
