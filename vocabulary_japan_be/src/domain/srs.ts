import { addDays, addMinutes, startOfDay } from './dates.ts';

/**
 * Thuật toán SRS (SM-2 rút gọn), chép từ frontend (src/utils/srs.ts) để hai bên chấm giống hệt
 * nhau. Khác duy nhất: mốc "00:00 của ngày" tính theo múi giờ của app (tham số `tz`) thay vì
 * giờ trình duyệt. Trạng thái dùng đúng tên trường của hợp đồng API (snake_case, thời điểm là
 * chuỗi ISO) để dùng lại nguyên test của frontend; service tự đổi sang model Prisma.
 */

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;
export type WordStatus = 'new' | 'learning' | 'review' | 'mastered';

export interface SrsState {
  status: WordStatus;
  ease: number;
  interval_days: number;
  repetitions: number;
  due_at: string | null;
  last_reviewed_at: string | null;
}

export const DEFAULT_SRS_STATE: SrsState = {
  status: 'new',
  ease: 2.5,
  interval_days: 0,
  repetitions: 0,
  due_at: null,
  last_reviewed_at: null,
};

export const MIN_EASE = 1.3;
/** Thẻ chấm dưới 3 sẽ đến hạn lại sau 10 phút. */
export const RELEARN_DELAY_MINUTES = 10;
/** Khoảng cách (ngày) từ đó một từ được coi là đã thuộc. */
export const MASTERED_INTERVAL_DAYS = 21;
const EASY_BONUS = 1.3;

/**
 * Trạng thái suy ra từ số liệu SRS (mục 5.1):
 * - learning: repetitions < 2
 * - review:   repetitions ≥ 2 và interval_days < 21
 * - mastered: interval_days ≥ 21
 * `new` chỉ có khi chưa từng chấm, nên hàm này chỉ dùng sau khi đã chấm.
 */
export function deriveStatus(repetitions: number, intervalDays: number): Exclude<WordStatus, 'new'> {
  if (intervalDays >= MASTERED_INTERVAL_DAYS) return 'mastered';
  if (repetitions < 2) return 'learning';
  return 'review';
}

/** ease + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02)), tối thiểu 1.3, làm tròn 2 chữ số. */
export function nextEase(ease: number, quality: Quality): number {
  const q = 5 - quality;
  const updated = ease + (0.1 - q * (0.08 + q * 0.02));
  return Math.max(MIN_EASE, Math.round(updated * 100) / 100);
}

/**
 * Áp dụng một lần chấm điểm. Hàm thuần: thời điểm (`now`) và múi giờ (`tz`) truyền vào.
 *
 * - quality < 3: repetitions = 0, interval_days = 0, đến hạn lại sau 10 phút.
 * - quality ≥ 3: repetitions + 1. Lần 1 → 1 ngày, lần 2 → 6 ngày, từ lần 3 →
 *   round(interval_days × ease cũ). quality = 5 nhân thêm 1.3 rồi làm tròn. Tối thiểu 1 ngày.
 * - ease cập nhật sau mọi lần chấm, không thấp hơn 1.3.
 * - interval_days ≥ 1: due_at là 00:00 (theo `tz`) của ngày hôm nay + interval_days.
 */
export function applyGrade(state: SrsState, quality: Quality, now: Date, tz: string): SrsState {
  const ease = nextEase(state.ease, quality);

  if (quality < 3) {
    return {
      status: deriveStatus(0, 0),
      ease,
      repetitions: 0,
      interval_days: 0,
      due_at: addMinutes(now, RELEARN_DELAY_MINUTES).toISOString(),
      last_reviewed_at: now.toISOString(),
    };
  }

  const repetitions = state.repetitions + 1;
  let interval: number;
  if (repetitions === 1) interval = 1;
  else if (repetitions === 2) interval = 6;
  else interval = Math.round(state.interval_days * state.ease);
  if (quality === 5) interval = Math.round(interval * EASY_BONUS);
  interval = Math.max(1, interval);

  return {
    status: deriveStatus(repetitions, interval),
    ease,
    repetitions,
    interval_days: interval,
    due_at: startOfDay(addDays(now, interval, tz), tz).toISOString(),
    last_reviewed_at: now.toISOString(),
  };
}

/** Thẻ chấm dưới 3 được đưa xuống cuối hàng đợi một lần trong phiên (phía giao diện). */
export function shouldRequeue(quality: Quality): boolean {
  return quality < 3;
}
