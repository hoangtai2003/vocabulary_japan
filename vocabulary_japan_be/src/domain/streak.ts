import { addDays, diffInCalendarDays, parseDateKey, toDateKey } from './dates.ts';

export interface StreakResult {
  current: number;
  longest: number;
}

/**
 * Tính streak từ danh sách ngày có học (prompt mục 5.4), chép từ frontend (src/utils/streak.ts);
 * "ngày" tính theo múi giờ của app (`tz`).
 *
 * Một ngày được tính khi có ít nhất 1 dòng review_logs; đầu vào là các khóa YYYY-MM-DD
 * (cột local_date, có thể trùng, không cần sắp xếp).
 *
 * - current: đếm lùi các ngày liên tiếp kết thúc ở hôm nay. Hôm nay chưa học thì đếm lùi từ
 *   hôm qua, để streak không về 0 chỉ vì người dùng chưa mở app hôm nay. Bỏ một ngày (hôm qua
 *   và hôm nay đều không học) thì streak về 0.
 * - longest: chuỗi ngày liên tiếp dài nhất trong toàn bộ lịch sử.
 * Ngày trong tương lai (so với `today`) bị bỏ qua.
 */
export function computeStreak(activeDays: Iterable<string>, today: Date, tz: string): StreakResult {
  const todayKey = toDateKey(today, tz);
  const days = new Set<string>();
  for (const key of activeDays) {
    if (key <= todayKey) days.add(key);
  }

  let cursor = days.has(todayKey) ? today : addDays(today, -1, tz);
  let current = 0;
  while (days.has(toDateKey(cursor, tz))) {
    current += 1;
    cursor = addDays(cursor, -1, tz);
  }

  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const key of sorted) {
    const date = parseDateKey(key, tz);
    run = previous && diffInCalendarDays(date, previous, tz) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }

  return { current, longest: Math.max(longest, current) };
}
