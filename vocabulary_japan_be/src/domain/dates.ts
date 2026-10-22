import { TZDate } from '@date-fns/tz';
import {
  addDays as addDaysFns,
  addMinutes as addMinutesFns,
  differenceInCalendarDays,
  endOfDay as endOfDayFns,
  format,
  startOfDay as startOfDayFns,
  startOfWeek as startOfWeekFns,
} from 'date-fns';

/**
 * Tiện ích ngày tháng theo múi giờ của app (APP_TIMEZONE, mặc định Asia/Ho_Chi_Minh).
 *
 * Bản frontend tính theo giờ trình duyệt; backend tính theo múi giờ cấu hình, để "hôm nay",
 * "cuối ngày", "tuần" giống nhau với mọi người dùng bất kể server đặt ở đâu. Mọi phép tính
 * đi qua TZDate (date-fns + @date-fns/tz), không tự cộng trừ giờ, nên đúng cả khi múi giờ
 * có giờ mùa hè. Kết quả trả về là Date thường (một thời điểm tuyệt đối, lưu được vào DB).
 * Hàm thuần: không đọc đồng hồ, thời điểm và múi giờ đều truyền vào.
 */

const inZone = (date: Date, tz: string) => new TZDate(date.getTime(), tz);
const toDate = (date: Date) => new Date(date.getTime());

/** 00:00:00.000 của ngày chứa `date`, theo múi giờ `tz`. */
export function startOfDay(date: Date, tz: string): Date {
  return toDate(startOfDayFns(inZone(date, tz)));
}

/** 23:59:59.999 của ngày chứa `date`, theo múi giờ `tz`. */
export function endOfDay(date: Date, tz: string): Date {
  return toDate(endOfDayFns(inZone(date, tz)));
}

/** Cộng `days` ngày theo lịch của múi giờ `tz` (giữ nguyên giờ địa phương). */
export function addDays(date: Date, days: number, tz: string): Date {
  return toDate(addDaysFns(inZone(date, tz), days));
}

export function addMinutes(date: Date, minutes: number): Date {
  return addMinutesFns(date, minutes);
}

/** Khóa ngày YYYY-MM-DD theo múi giờ `tz`. */
export function toDateKey(date: Date, tz: string): string {
  return format(inZone(date, tz), 'yyyy-MM-dd');
}

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Đọc YYYY-MM-DD thành thời điểm 00:00 của ngày đó theo múi giờ `tz`. */
export function parseDateKey(key: string, tz: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return toDate(new TZDate(y ?? 1970, (m ?? 1) - 1, d ?? 1, tz));
}

export function isDateKey(value: string, tz: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  return toDateKey(parseDateKey(value, tz), tz) === value;
}

/** Số ngày lịch từ `from` đến `to` (to − from) theo múi giờ `tz`. */
export function diffInCalendarDays(to: Date, from: Date, tz: string): number {
  return differenceInCalendarDays(inZone(to, tz), inZone(from, tz));
}

/** Thứ Hai đầu tuần chứa `date`, lúc 00:00 theo múi giờ `tz`. */
export function startOfWeek(date: Date, tz: string): Date {
  return toDate(startOfWeekFns(inZone(date, tz), { weekStartsOn: 1 }));
}
