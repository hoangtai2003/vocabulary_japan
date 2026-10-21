/**
 * Tiện ích ngày tháng theo giờ địa phương của trình duyệt.
 * Ngày học bắt đầu lúc 00:00 giờ địa phương (mục 5.3). Backend sẽ dùng Asia/Ho_Chi_Minh.
 * Mọi hàm nhận Date làm tham số, không tự gọi new Date(), để test được.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 00:00:00.000 của ngày chứa `date`. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 23:59:59.999 của ngày chứa `date`. */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Cộng `days` ngày theo lịch (giữ nguyên giờ, an toàn với giờ mùa hè). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/** Khóa ngày dạng YYYY-MM-DD theo giờ địa phương. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateKey(value: string): boolean {
  const match = DATE_KEY_RE.exec(value);
  if (!match) return false;
  const date = parseDateKey(value);
  return toDateKey(date) === value;
}

/** Đọc YYYY-MM-DD thành Date lúc 00:00 giờ địa phương. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Số ngày lịch từ `from` đến `to` (to − from), bỏ qua giờ. */
export function diffInCalendarDays(to: Date, from: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

/** Thứ Hai đầu tuần chứa `date`, lúc 00:00. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = Chủ nhật
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}
