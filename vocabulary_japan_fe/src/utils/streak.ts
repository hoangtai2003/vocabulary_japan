import { addDays, diffInCalendarDays, parseDateKey, toDateKey } from './dates';

export interface StreakResult {
  current: number;
  longest: number;
}

/**
 * Tính streak từ danh sách ngày có học (mục 5.3).
 *
 * Một ngày được tính khi người dùng chấm ít nhất 1 thẻ; danh sách vào là các khóa
 * YYYY-MM-DD của những ngày đó (có thể trùng, không cần sắp xếp).
 *
 * - current: đếm lùi các ngày liên tiếp kết thúc ở hôm nay. Nếu hôm nay chưa học thì đếm
 *   lùi từ hôm qua, để streak không về 0 chỉ vì người dùng chưa mở app hôm nay.
 *   Bỏ một ngày (hôm qua và hôm nay đều không học) thì streak về 0.
 * - longest: chuỗi ngày liên tiếp dài nhất trong toàn bộ lịch sử.
 * Ngày trong tương lai (so với `today`) bị bỏ qua.
 */
export function computeStreak(activeDays: Iterable<string>, today: Date): StreakResult {
  const todayKey = toDateKey(today);
  const days = new Set<string>();
  for (const key of activeDays) {
    if (key <= todayKey) days.add(key);
  }

  let cursor = days.has(todayKey) ? today : addDays(today, -1);
  let current = 0;
  while (days.has(toDateKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const key of sorted) {
    const date = parseDateKey(key);
    run = previous && diffInCalendarDays(date, previous) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }

  return { current, longest: Math.max(longest, current) };
}
