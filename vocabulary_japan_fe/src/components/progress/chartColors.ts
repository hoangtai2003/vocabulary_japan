import { useThemeStore } from '@/stores/themeStore';

/**
 * Màu dữ liệu của trang Tiến độ, đã kiểm bằng validator của skill dataviz
 * (scripts/validate_palette.js):
 * - Cột tuần (categorical, 2 slot): son + chàm 藍 — qua mọi kiểm tra ở cả hai chế độ
 *   (CVD ΔE 17.8 sáng / 19.5 tối, tương phản ≥ 3:1 với nền thẻ).
 * - Heatmap (ordinal, một tông son, 4 bậc nhạt → đậm) — bậc nhạt nhất ≥ 2:1 với nền thẻ.
 * Dùng mã màu thật (không dùng var()) vì SVG presentation attribute không đọc biến CSS.
 */
const palettes = {
  light: {
    newWords: '#C2362B',
    reviews: '#3464A0',
    grid: '#D9CFBF',
    axis: '#625A4E',
    cursor: 'rgba(30, 27, 22, 0.06)',
    heat: ['#E4DBCC', '#EA998C', '#DA6D5F', '#C13D31', '#901F17'],
  },
  dark: {
    newWords: '#E0574A',
    reviews: '#5890CD',
    grid: '#3A342B',
    axis: '#A99F8E',
    cursor: 'rgba(237, 230, 216, 0.06)',
    heat: ['#2E2A22', '#96372D', '#C4493C', '#E26C5E', '#F4A296'],
  },
} as const;

export type ChartColors = (typeof palettes)['light'] | (typeof palettes)['dark'];

export function useChartColors(): ChartColors {
  const resolved = useThemeStore((s) => s.resolved);
  return palettes[resolved];
}
