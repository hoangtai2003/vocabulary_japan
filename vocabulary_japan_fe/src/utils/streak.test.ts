import { describe, expect, it } from 'vitest';
import { addDays, toDateKey } from './dates';
import { computeStreak } from './streak';

const TODAY = new Date(2026, 9, 21, 15, 0);
const daysAgo = (...offsets: number[]) => offsets.map((n) => toDateKey(addDays(TODAY, -n)));

describe('computeStreak', () => {
  it('chuỗi liên tục tính cả hôm nay', () => {
    expect(computeStreak(daysAgo(0, 1, 2, 3), TODAY)).toEqual({ current: 4, longest: 4 });
  });

  it('hôm nay chưa học vẫn giữ streak tính đến hôm qua', () => {
    expect(computeStreak(daysAgo(1, 2, 3, 4), TODAY).current).toBe(4);
  });

  it('bị ngắt một ngày thì streak về 0', () => {
    expect(computeStreak(daysAgo(2, 3, 4), TODAY).current).toBe(0);
  });

  it('ngắt giữa chừng chỉ đếm đoạn gần nhất, longest giữ đoạn dài nhất', () => {
    const result = computeStreak(daysAgo(0, 1, 3, 4, 5, 6, 7, 8), TODAY);
    expect(result).toEqual({ current: 2, longest: 6 });
  });

  it('không có ngày nào và bỏ qua ngày trùng/tương lai', () => {
    expect(computeStreak([], TODAY)).toEqual({ current: 0, longest: 0 });
    const keys = [...daysAgo(0, 0, 1), toDateKey(addDays(TODAY, 1))];
    expect(computeStreak(keys, TODAY)).toEqual({ current: 2, longest: 2 });
  });

  it('đếm đúng qua ranh giới tháng', () => {
    const first = new Date(2026, 10, 1, 9);
    const keys = [0, 1, 2].map((n) => toDateKey(addDays(first, -n)));
    expect(computeStreak(keys, first).current).toBe(3);
  });
});
