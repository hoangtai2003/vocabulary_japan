import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { addDays, parseDateKey, toDateKey } from '@/utils/dates';
import { formatLongDate } from '@/utils/format';
import { buildHeatmap, HEATMAP_BINS, type HeatmapCell } from '@/utils/heatmap';
import { ChartCard } from './ChartCard';
import { useChartColors } from './chartColors';

const WEEKDAY_LABELS = ['T2', '', 'T4', '', 'T6', '', 'CN'];

function cellLabel(cell: HeatmapCell): string {
  const date = formatLongDate(cell.date);
  return cell.count > 0 ? `${date}: ${cell.count} lượt học` : `${date}: không học`;
}

interface TooltipState {
  cell: HeatmapCell;
  left: number;
  top: number;
}

/**
 * Heatmap lịch học 6 tháng, tự vẽ bằng lưới CSS: cột là tuần, hàng là thứ (T2 → CN).
 * Mỗi ô có aria-label ghi ngày và số lượt. Bàn phím: cả lưới là một điểm dừng Tab, phím
 * mũi tên di chuyển giữa các ngày (←/→ một tuần, ↑/↓ một ngày), Home/End về đầu/cuối.
 * Rê chuột hoặc focus vào ô thì hiện tooltip.
 */
export function StudyHeatmap({
  days,
  today,
}: {
  days: { date: string; count: number }[];
  today: Date;
}) {
  const colors = useChartColors();
  const layout = useMemo(() => buildHeatmap(days, today), [days, today]);
  const todayKey = toDateKey(today);
  const [focusKey, setFocusKey] = useState(todayKey);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const showTooltip = (cell: HeatmapCell, element: HTMLElement) => {
    const wrapper = wrapperRef.current?.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    if (!wrapper) return;
    // Giữ tooltip trong khung: tâm cách mép ít nhất 80px.
    const center = rect.left - wrapper.left + rect.width / 2;
    setTooltip({
      cell,
      left: Math.min(Math.max(center, 80), wrapper.width - 80),
      top: rect.top - wrapper.top,
    });
  };

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = {
      ArrowLeft: -7,
      ArrowRight: 7,
      ArrowUp: -1,
      ArrowDown: 1,
    };
    let next: string | null = null;
    if (event.key in steps) {
      const candidate = toDateKey(addDays(parseDateKey(focusKey), steps[event.key] ?? 0));
      if (candidate >= layout.from && candidate <= layout.to) next = candidate;
    } else if (event.key === 'Home') next = layout.from;
    else if (event.key === 'End') next = layout.to;
    if (!next) return;
    event.preventDefault();
    setFocusKey(next);
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${next}"]`)?.focus();
  };

  return (
    <ChartCard
      title="Lịch học 6 tháng"
      description={
        layout.activeDays > 0
          ? `Bạn đã học ${layout.activeDays} ngày trong 6 tháng qua.`
          : 'Chưa có ngày học nào trong 6 tháng qua.'
      }
    >
      <div ref={wrapperRef} className="relative" onMouseLeave={() => setTooltip(null)}>
        {/* Nhãn tháng, cùng lưới cột với các ô */}
        <div
          aria-hidden="true"
          className="mb-1 ml-7 grid text-[11px] text-ink-muted"
          style={{ gridTemplateColumns: `repeat(${layout.columns.length}, minmax(0, 1fr))` }}
        >
          {layout.monthLabels.map((m) => (
            <span
              key={`${m.column}-${m.label}`}
              className="whitespace-nowrap"
              style={{ gridColumnStart: m.column + 1 }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex gap-1">
          <div
            aria-hidden="true"
            className="grid w-6 shrink-0 grid-rows-7 gap-[2px] text-[10px] leading-none text-ink-muted"
          >
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="flex items-center">
                {label}
              </span>
            ))}
          </div>
          <div
            ref={gridRef}
            role="grid"
            aria-label="Lịch học: mỗi ô là một ngày, màu đậm hơn là học nhiều lượt hơn"
            onKeyDown={moveFocus}
            className="grid min-w-0 flex-1 grid-flow-col grid-rows-7 gap-[2px]"
            style={{ gridTemplateColumns: `repeat(${layout.columns.length}, minmax(0, 1fr))` }}
          >
            {layout.columns.map((column, c) =>
              column.map((cell, r) =>
                cell ? (
                  <div
                    key={cell.date}
                    role="gridcell"
                    data-date={cell.date}
                    aria-label={cellLabel(cell)}
                    tabIndex={cell.date === focusKey ? 0 : -1}
                    onMouseEnter={(e) => showTooltip(cell, e.currentTarget)}
                    onFocus={(e) => {
                      setFocusKey(cell.date);
                      showTooltip(cell, e.currentTarget);
                    }}
                    onBlur={() => setTooltip(null)}
                    className="aspect-square rounded-[2px] outline-offset-1 hover:outline hover:outline-ink focus-visible:outline-2"
                    style={{
                      backgroundColor: colors.heat[cell.level],
                      boxShadow:
                        cell.date === todayKey ? `inset 0 0 0 1.5px ${colors.axis}` : undefined,
                    }}
                  />
                ) : (
                  <div key={`empty-${c}-${r}`} aria-hidden="true" />
                ),
              ),
            )}
          </div>
        </div>

        {tooltip && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[var(--radius-control)] border border-rule-strong bg-surface px-2.5 py-1.5 text-xs"
            style={{
              left: tooltip.left,
              top: tooltip.top - 6,
            }}
          >
            <span className="font-semibold">
              {tooltip.cell.count > 0 ? `${tooltip.cell.count} lượt` : 'Không học'}
            </span>
            <span className="text-ink-muted"> · {formatLongDate(tooltip.cell.date)}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-ink-muted">
        <div className="flex items-center gap-1.5">
          <span>Ít</span>
          {colors.heat.map((color, level) => (
            <span
              key={color}
              aria-hidden="true"
              className="size-3 rounded-[2px]"
              style={{ backgroundColor: color }}
              title={level === 0 ? 'Không học' : HEATMAP_BINS[level - 1]?.label}
            />
          ))}
          <span>Nhiều</span>
        </div>
        <p>
          <span className="sr-only">Chú giải: </span>Ô nhạt nhất: không học ·{' '}
          {HEATMAP_BINS.map((b) => b.label).join(' · ')}
        </p>
      </div>
    </ChartCard>
  );
}
