import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type LabelProps,
} from 'recharts';
import type { WeeklyStatsItem } from '@/types/api';
import { addDays, parseDateKey } from '@/utils/dates';
import { formatShortDate } from '@/utils/format';
import { ChartCard } from './ChartCard';
import { useChartColors } from './chartColors';

const SERIES = [
  { key: 'new_learned', label: 'Từ mới' },
  { key: 'reviewed', label: 'Lượt ôn' },
] as const;

type SeriesKey = (typeof SERIES)[number]['key'];

const weekLabel = (weekStart: string) => formatShortDate(parseDateKey(weekStart));
const weekRange = (weekStart: string) =>
  `${weekLabel(weekStart)} – ${formatShortDate(addDays(parseDateKey(weekStart), 6))}`;

interface TooltipPayloadItem {
  dataKey?: unknown;
  value?: unknown;
}

/** Tooltip: giá trị đậm đứng trước, tên series theo sau, khóa bằng vạch màu ngắn. */
function WeeklyTooltip({
  active,
  payload,
  label,
  colors,
}: {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  label?: unknown;
  colors: Record<SeriesKey, string>;
}) {
  if (!active || !payload?.length || typeof label !== 'string') return null;
  return (
    <div className="rounded-[var(--radius-control)] border border-rule-strong bg-surface px-3 py-2 text-sm">
      <p className="mb-1 text-xs text-ink-muted">Tuần {weekRange(label)}</p>
      {SERIES.map((series) => {
        const value = payload.find((p) => p.dataKey === series.key)?.value;
        return (
          <p key={series.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-3"
              style={{ backgroundColor: colors[series.key] }}
            />
            <span className="font-semibold tabular-nums">{String(value ?? 0)}</span>
            <span className="text-ink-muted">{series.label}</span>
          </p>
        );
      })}
    </div>
  );
}

/**
 * Biểu đồ cột 8 tuần: hai cột mỗi tuần (từ mới, lượt ôn). Theo quy cách của skill dataviz:
 * cột ≤ 24px (14px), bo 4px ở đầu, cách nhau 2px, lưới ngang mảnh liền nét, chú giải luôn có,
 * nhãn trực tiếp chỉ ở tuần mới nhất, tooltip khi rê chuột, và bảng số liệu thay thế.
 */
export function WeeklyChart({ weeks }: { weeks: WeeklyStatsItem[] }) {
  const colors = useChartColors();
  const [showTable, setShowTable] = useState(false);
  const seriesColors: Record<SeriesKey, string> = {
    new_learned: colors.newWords,
    reviewed: colors.reviews,
  };
  const lastIndex = weeks.length - 1;

  /**
   * Nhãn trực tiếp chỉ ở tuần mới nhất (không ghi số trên mọi cột).
   * `index` của Recharts đếm theo các cột được vẽ — cột giá trị 0 bị bỏ qua — nên cột của
   * tuần mới nhất có index = số tuần khác 0 − 1, và chỉ có nhãn khi tuần đó khác 0.
   */
  const endLabel = (key: SeriesKey) => (props: LabelProps) => {
    const { value, index } = props;
    const latest = weeks[lastIndex]?.[key] ?? 0;
    const latestDrawnIndex = weeks.filter((w) => w[key] > 0).length - 1;
    // Recharts 3 truyền toạ độ của cột qua viewBox (không qua x/y/width).
    const box = props.viewBox as { x?: number; y?: number; width?: number } | undefined;
    if (latest === 0 || index !== latestDrawnIndex || box?.x === undefined || box.y === undefined) {
      return null;
    }
    return (
      <text
        x={box.x + (box.width ?? 0) / 2}
        y={box.y - 6}
        textAnchor="middle"
        fontSize={12}
        fill={colors.axis}
      >
        {value}
      </text>
    );
  };

  return (
    <ChartCard
      title="8 tuần gần nhất"
      description="Số từ mới học và số lượt ôn mỗi tuần (tuần bắt đầu từ thứ Hai)."
      actions={
        <button
          type="button"
          aria-expanded={showTable}
          onClick={() => setShowTable((v) => !v)}
          className="text-sm font-semibold text-son-ink underline underline-offset-4"
        >
          {showTable ? 'Xem biểu đồ' : 'Xem dạng bảng'}
        </button>
      }
    >
      <ul className="mb-3 flex flex-wrap gap-4 text-sm" aria-label="Chú giải">
        {SERIES.map((series) => (
          <li key={series.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 rounded-[2px]"
              style={{ backgroundColor: seriesColors[series.key] }}
            />
            {series.label}
          </li>
        ))}
      </ul>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Số từ mới và lượt ôn theo tuần</caption>
            <thead>
              <tr className="border-b border-rule text-left text-ink-muted">
                <th scope="col" className="py-2 font-medium">
                  Tuần
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Từ mới
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Lượt ôn
                </th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.week_start} className="border-b border-rule">
                  <th scope="row" className="py-2 text-left font-normal">
                    {weekRange(w.week_start)}
                  </th>
                  <td className="py-2 text-right tabular-nums">{w.new_learned}</td>
                  <td className="py-2 text-right tabular-nums">{w.reviewed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="h-60"
          role="img"
          aria-label="Biểu đồ cột số từ mới và lượt ôn 8 tuần gần nhất. Bấm “Xem dạng bảng” để đọc số liệu."
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 600, height: 240 }}
          >
            <BarChart
              data={weeks}
              barGap={2}
              barCategoryGap="28%"
              margin={{ top: 20, right: 4, bottom: 0, left: -20 }}
            >
              <CartesianGrid vertical={false} stroke={colors.grid} strokeWidth={1} />
              <XAxis
                dataKey="week_start"
                tickFormatter={weekLabel}
                tick={{ fill: colors.axis, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: colors.grid }}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: colors.axis, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                cursor={{ fill: colors.cursor }}
                content={(props) => (
                  <WeeklyTooltip
                    active={props.active}
                    payload={props.payload}
                    label={props.label}
                    colors={seriesColors}
                  />
                )}
              />
              {SERIES.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  fill={seriesColors[series.key]}
                  maxBarSize={14}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  <LabelList dataKey={series.key} content={endLabel(series.key)} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
