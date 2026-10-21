import type { Quality } from '@/types/api';
import type { UserWordState, WordStatus } from '@/types/word';
import { addDays, addMinutes, startOfDay } from './dates';

/** Các trường SRS của một từ mà thuật toán đọc và ghi. */
export type SrsState = Pick<
  UserWordState,
  'status' | 'ease' | 'interval_days' | 'repetitions' | 'due_at' | 'last_reviewed_at'
>;

export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;
/** Thẻ chấm dưới 3 sẽ đến hạn lại sau 10 phút. */
export const RELEARN_DELAY_MINUTES = 10;
/** Khoảng cách (ngày) từ đó một từ được coi là đã thuộc. */
export const MASTERED_INTERVAL_DAYS = 21;
const EASY_BONUS = 1.3;

/**
 * Trạng thái hiển thị suy ra từ số liệu SRS (mục 5.2):
 * - learning: repetitions < 2
 * - review:   repetitions ≥ 2 và interval_days < 21
 * - mastered: interval_days ≥ 21
 * Trạng thái `new` chỉ có khi chưa từng chấm, nên hàm này chỉ dùng sau khi đã chấm.
 */
export function deriveStatus(
  repetitions: number,
  intervalDays: number,
): Exclude<WordStatus, 'new'> {
  if (intervalDays >= MASTERED_INTERVAL_DAYS) return 'mastered';
  if (repetitions < 2) return 'learning';
  return 'review';
}

/** Công thức ease của SM-2: ease + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02)), tối thiểu 1.3. */
export function nextEase(ease: number, quality: Quality): number {
  const q = 5 - quality;
  const updated = ease + (0.1 - q * (0.08 + q * 0.02));
  // Làm tròn 2 chữ số để tránh sai số dấu phẩy động tích lũy qua nhiều lần chấm.
  return Math.max(MIN_EASE, Math.round(updated * 100) / 100);
}

/**
 * Áp dụng một lần chấm điểm theo SM-2 rút gọn (mục 5.2). Hàm thuần: không đọc đồng hồ,
 * thời điểm chấm được truyền vào qua `now`.
 *
 * - quality < 3 (Quên): repetitions = 0, interval_days = 0, đến hạn lại sau 10 phút.
 *   Việc đưa thẻ xuống cuối hàng đợi trong phiên do phía giao diện xử lý (xem shouldRequeue).
 * - quality ≥ 3: repetitions + 1. Lần 1 → 1 ngày, lần 2 → 6 ngày, từ lần 3 →
 *   round(interval_days × ease) với ease cũ (trước khi cập nhật, đúng như SM-2).
 *   quality = 5 nhân thêm 1.3. Khoảng cách tối thiểu 1 ngày.
 * - ease cập nhật sau mọi lần chấm, không thấp hơn 1.3.
 * - Với interval_days ≥ 1, due_at là 00:00 của ngày (hôm nay + interval_days), để thẻ đến
 *   hạn theo ngày chứ không theo giờ.
 */
export function applyGrade(state: SrsState, quality: Quality, now: Date): SrsState {
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
    due_at: startOfDay(addDays(now, interval)).toISOString(),
    last_reviewed_at: now.toISOString(),
  };
}

/** Thẻ chấm dưới 3 được đưa xuống cuối hàng đợi một lần trong phiên hiện tại. */
export function shouldRequeue(quality: Quality): boolean {
  return quality < 3;
}
