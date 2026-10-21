import { describe, expect, it } from 'vitest';
import { applyGrade, deriveStatus, nextEase, shouldRequeue, type SrsState } from './srs';

const NEW_STATE: SrsState = {
  status: 'new',
  ease: 2.5,
  interval_days: 0,
  repetitions: 0,
  due_at: null,
  last_reviewed_at: null,
};

// 10:30 sáng giờ địa phương, 21/10/2026
const NOW = new Date(2026, 9, 21, 10, 30, 0);

function localMidnight(year: number, month: number, day: number): string {
  return new Date(year, month, day).toISOString();
}

describe('applyGrade', () => {
  it('quality 1 (Quên): đặt lại repetitions, đến hạn sau 10 phút', () => {
    const learned: SrsState = { ...NEW_STATE, status: 'review', repetitions: 3, interval_days: 15 };
    const result = applyGrade(learned, 1, NOW);
    expect(result.repetitions).toBe(0);
    expect(result.interval_days).toBe(0);
    expect(result.status).toBe('learning');
    expect(result.due_at).toBe(new Date(NOW.getTime() + 10 * 60 * 1000).toISOString());
    expect(result.last_reviewed_at).toBe(NOW.toISOString());
    expect(result.ease).toBeCloseTo(1.96);
  });

  it('quality 3 (Khó): lần đầu cách 1 ngày, ease giảm 0.14', () => {
    const result = applyGrade(NEW_STATE, 3, NOW);
    expect(result.repetitions).toBe(1);
    expect(result.interval_days).toBe(1);
    expect(result.status).toBe('learning');
    expect(result.ease).toBeCloseTo(2.36);
    expect(result.due_at).toBe(localMidnight(2026, 9, 22));
  });

  it('quality 4 (Được): lần 1 → 1 ngày, lần 2 → 6 ngày, lần 3 → round(interval × ease)', () => {
    const first = applyGrade(NEW_STATE, 4, NOW);
    expect(first.interval_days).toBe(1);
    expect(first.ease).toBe(2.5);

    const second = applyGrade(first, 4, NOW);
    expect(second.repetitions).toBe(2);
    expect(second.interval_days).toBe(6);
    expect(second.status).toBe('review');
    expect(second.due_at).toBe(localMidnight(2026, 9, 27));

    const third = applyGrade(second, 4, NOW);
    expect(third.interval_days).toBe(15); // round(6 × 2.5)
  });

  it('quality 5 (Dễ): nhân thêm 1.3 và tăng ease', () => {
    const second: SrsState = { ...NEW_STATE, status: 'learning', repetitions: 1, interval_days: 1 };
    const result = applyGrade(second, 5, NOW);
    expect(result.interval_days).toBe(8); // round(6 × 1.3)
    expect(result.ease).toBeCloseTo(2.6);
  });

  it('ease không xuống dưới 1.3', () => {
    let state: SrsState = { ...NEW_STATE, ease: 1.4 };
    for (let i = 0; i < 5; i += 1) state = applyGrade(state, 1, NOW);
    expect(state.ease).toBe(1.3);
    expect(nextEase(1.3, 0)).toBe(1.3);
  });

  it('chuyển sang mastered khi interval_days ≥ 21', () => {
    const state: SrsState = {
      ...NEW_STATE,
      status: 'review',
      repetitions: 2,
      interval_days: 6,
      ease: 2.5,
    };
    const third = applyGrade(state, 4, NOW);
    expect(third.status).toBe('review'); // 15 ngày
    const fourth = applyGrade(third, 4, NOW);
    expect(fourth.interval_days).toBe(38); // round(15 × 2.5)
    expect(fourth.status).toBe('mastered');
  });

  it('due_at là 00:00 của ngày (hôm nay + interval), không phụ thuộc giờ chấm', () => {
    const late = new Date(2026, 9, 21, 23, 59);
    const early = new Date(2026, 9, 21, 0, 1);
    expect(applyGrade(NEW_STATE, 4, late).due_at).toBe(applyGrade(NEW_STATE, 4, early).due_at);
  });

  it('không thay đổi state đầu vào', () => {
    const input = { ...NEW_STATE };
    applyGrade(input, 4, NOW);
    expect(input).toEqual(NEW_STATE);
  });
});

describe('deriveStatus và shouldRequeue', () => {
  it('suy ra trạng thái theo repetitions và interval', () => {
    expect(deriveStatus(0, 0)).toBe('learning');
    expect(deriveStatus(1, 1)).toBe('learning');
    expect(deriveStatus(2, 6)).toBe('review');
    expect(deriveStatus(4, 21)).toBe('mastered');
  });

  it('chỉ đưa lại vào hàng đợi khi quality < 3', () => {
    expect(shouldRequeue(1)).toBe(true);
    expect(shouldRequeue(2)).toBe(true);
    expect(shouldRequeue(3)).toBe(false);
    expect(shouldRequeue(5)).toBe(false);
  });
});
