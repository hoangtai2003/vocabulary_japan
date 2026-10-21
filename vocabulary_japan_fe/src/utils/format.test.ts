import { describe, expect, it } from 'vitest';
import { formatLongDate, formatNextReview } from './format';

const NOW = new Date(2026, 9, 21, 15, 0); // thứ Tư

describe('format', () => {
  it('ngày dài viết hoa chữ đầu', () => {
    expect(formatLongDate('2026-10-21')).toBe('Thứ Tư, 21 tháng 10');
  });

  it('ngày ôn tiếp theo', () => {
    expect(formatNextReview(new Date(2026, 9, 22).toISOString(), NOW)).toBe('ngày mai');
    expect(formatNextReview(new Date(2026, 9, 23).toISOString(), NOW)).toBe('thứ Sáu');
    expect(formatNextReview(new Date(2026, 10, 21).toISOString(), NOW)).toBe('21/11');
  });
});
