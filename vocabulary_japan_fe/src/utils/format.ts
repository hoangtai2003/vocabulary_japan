import { diffInCalendarDays, parseDateKey } from './dates';

const longDate = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' });
const shortDate = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'numeric' });

/** "Thứ Tư, 21 tháng 10" — viết hoa chữ cái đầu. */
export function formatLongDate(dateKeyOrDate: string | Date): string {
  const date = typeof dateKeyOrDate === 'string' ? parseDateKey(dateKeyOrDate) : dateKeyOrDate;
  return capitalize(longDate.format(date));
}

/** "thứ Sáu" — viết thường chữ đầu để đứng giữa câu. */
export function formatWeekday(date: Date): string {
  const value = weekday.format(date);
  return value.charAt(0).toLowerCase() + value.slice(1);
}

/** "21/10" */
export function formatShortDate(date: Date): string {
  return shortDate.format(date);
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Ngày ôn tiếp theo theo cách nói tự nhiên: "ngày mai", "thứ Sáu" (trong 7 ngày tới),
 * hoặc "21/11" (xa hơn).
 */
export function formatNextReview(iso: string, now: Date): string {
  const target = new Date(iso);
  const days = diffInCalendarDays(target, now);
  if (days <= 0) return 'hôm nay';
  if (days === 1) return 'ngày mai';
  if (days < 7) return formatWeekday(target);
  return formatShortDate(target);
}
