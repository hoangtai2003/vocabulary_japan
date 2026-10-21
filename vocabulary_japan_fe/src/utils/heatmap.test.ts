import { describe, expect, it } from 'vitest';
import { buildHeatmap, heatLevel, heatmapRange, HEATMAP_WEEKS } from './heatmap';

const TODAY = new Date(2026, 9, 21, 15); // thứ Tư

describe('heatmap', () => {
  it('chia mức theo số lượt', () => {
    expect([0, 1, 3, 4, 7, 8, 12, 13, 40].map(heatLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('khoảng ngày: từ thứ Hai 26 tuần trước đến hôm nay', () => {
    expect(heatmapRange(TODAY)).toEqual({ from: '2026-04-20', to: '2026-10-21' });
  });

  it('dựng lưới tuần × thứ, bỏ trống các ngày sau hôm nay', () => {
    const layout = buildHeatmap(
      [
        { date: '2026-10-21', count: 5 },
        { date: '2026-10-20', count: 15 },
      ],
      TODAY,
    );
    expect(layout.columns).toHaveLength(HEATMAP_WEEKS);
    const last = layout.columns[HEATMAP_WEEKS - 1]!;
    expect(last.map((c) => c?.date ?? null)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      null,
      null,
      null,
      null,
    ]);
    expect(last[1]?.level).toBe(4);
    expect(last[2]?.level).toBe(2);
    expect(layout.activeDays).toBe(2);
    expect(layout.monthLabels.map((m) => m.label)).toContain('Th10');
  });
});
