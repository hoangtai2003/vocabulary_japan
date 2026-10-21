import { addDays, startOfDay, startOfWeek, toDateKey } from './dates';

/** Số tuần (cột) của heatmap: 26 tuần trước + tuần hiện tại ≈ 6 tháng. */
export const HEATMAP_WEEKS = 27;

/**
 * Mức màu của một ngày theo số lượt chấm thẻ. 0 = không học (ô trống).
 * Bậc cố định thay vì theo phân vị, để cùng một màu luôn mang cùng một ý nghĩa.
 */
export const HEATMAP_BINS = [
  { level: 1, min: 1, max: 3, label: '1–3 lượt' },
  { level: 2, min: 4, max: 7, label: '4–7 lượt' },
  { level: 3, min: 8, max: 12, label: '8–12 lượt' },
  { level: 4, min: 13, max: Infinity, label: 'từ 13 lượt' },
] as const;

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export function heatLevel(count: number): HeatLevel {
  if (count <= 0) return 0;
  return (HEATMAP_BINS.find((bin) => count <= bin.max)?.level ?? 4) as HeatLevel;
}

export interface HeatmapCell {
  date: string;
  count: number;
  level: HeatLevel;
  /** 0 = thứ Hai … 6 = Chủ nhật */
  weekday: number;
}

export interface HeatmapLayout {
  from: string;
  to: string;
  /** columns[c][r]: cột là tuần, hàng là thứ; null cho ngày sau hôm nay. */
  columns: (HeatmapCell | null)[][];
  /** Nhãn tháng ở cột chứa ngày 1 của tháng (và cột đầu tiên). */
  monthLabels: { column: number; label: string }[];
  activeDays: number;
}

/** Khoảng ngày cần lấy cho heatmap: từ thứ Hai của 26 tuần trước đến hôm nay. */
export function heatmapRange(today: Date): { from: string; to: string } {
  const start = addDays(startOfWeek(today), -7 * (HEATMAP_WEEKS - 1));
  return { from: toDateKey(start), to: toDateKey(today) };
}

/** Dựng lưới heatmap: cột theo tuần (thứ Hai → Chủ nhật), từ cũ đến mới. */
export function buildHeatmap(days: { date: string; count: number }[], today: Date): HeatmapLayout {
  const counts = new Map(days.map((d) => [d.date, d.count]));
  const start = addDays(startOfWeek(today), -7 * (HEATMAP_WEEKS - 1));
  const end = startOfDay(today).getTime();
  const columns: (HeatmapCell | null)[][] = [];
  const monthLabels: HeatmapLayout['monthLabels'] = [];
  let activeDays = 0;

  for (let c = 0; c < HEATMAP_WEEKS; c += 1) {
    const column: (HeatmapCell | null)[] = [];
    for (let r = 0; r < 7; r += 1) {
      const date = addDays(start, c * 7 + r);
      if (date.getTime() > end) {
        column.push(null);
        continue;
      }
      const key = toDateKey(date);
      const count = counts.get(key) ?? 0;
      if (count > 0) activeDays += 1;
      column.push({ date: key, count, level: heatLevel(count), weekday: r });
      if (date.getDate() === 1 || (c === 0 && r === 0)) {
        monthLabels.push({ column: c, label: `Th${date.getMonth() + 1}` });
      }
    }
    columns.push(column);
  }
  // Nhãn cột đầu bị bỏ nếu ngay cột sau đã sang tháng mới (tránh hai nhãn chồng nhau).
  if (monthLabels.length > 1 && monthLabels[1]!.column - monthLabels[0]!.column < 3)
    monthLabels.shift();

  return { ...heatmapRange(today), columns, monthLabels, activeDays };
}
