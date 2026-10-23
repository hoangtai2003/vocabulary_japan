import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useExamStats } from '@/hooks/queries/useExams';
import type { ExamStats } from '@/types/exam';
import { formatDateTime, formatMs } from '@/utils/examFormat';
import { formatShortDate } from '@/utils/format';
import { SECTIONAL_MIN } from '@/utils/exam';
import { ChartCard } from './ChartCard';
import { useChartColors } from './chartColors';

type Point = ExamStats['attempts'][number] & { label: string; score: number };

/** Điểm ước tính qua các lượt thi thử trọn đề (FR-EXP-08): một đường, vạch điểm liệt 38. */
function ScoreChart({ attempts }: { attempts: ExamStats['attempts'] }) {
  const colors = useChartColors();
  const [showTable, setShowTable] = useState(false);
  const points: Point[] = attempts
    .filter((a) => a.estimated_score !== null)
    .map((a) => ({ ...a, label: formatShortDate(new Date(a.submitted_at)), score: a.estimated_score! }));

  return (
    <ChartCard
      title="Điểm thi thử"
      description="Điểm ước tính nhóm Kiến thức ngôn ngữ・Đọc hiểu (0–120) qua các lượt thi thử trọn đề."
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
      {showTable || points.length < 2 ? (
        <table className="w-full text-sm">
          <caption className="sr-only">Điểm ước tính các lượt thi thử</caption>
          <thead>
            <tr className="border-b border-rule text-left text-ink-muted">
              <th scope="col" className="py-2 font-medium">Lượt</th>
              <th scope="col" className="py-2 text-right font-medium">Đúng</th>
              <th scope="col" className="py-2 text-right font-medium">Điểm</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.attempt_id} className="border-b border-rule">
                <th scope="row" className="py-2 text-left font-normal">
                  <Link to={`/de-thi/ket-qua/${p.attempt_id}`} className="hover:underline">
                    {p.exam_title}
                  </Link>
                  <span className="block text-xs text-ink-muted">{formatDateTime(p.submitted_at)}</span>
                </th>
                <td className="py-2 text-right tabular-nums">
                  {p.correct}/{p.total}
                </td>
                <td className="py-2 text-right font-semibold tabular-nums">{p.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          className="h-56"
          role="img"
          aria-label={`Biểu đồ điểm ước tính ${points.length} lượt thi thử, gần nhất ${points.at(-1)!.score}/120. Bấm “Xem dạng bảng” để đọc số liệu.`}
        >
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 224 }}>
            <LineChart data={points} margin={{ top: 16, right: 12, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke={colors.grid} strokeWidth={1} />
              <XAxis
                dataKey="label"
                tick={{ fill: colors.axis, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: colors.grid }}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis domain={[0, 120]} ticks={[0, 40, 80, 120]} tick={{ fill: colors.axis, fontSize: 12 }} tickLine={false} axisLine={false} width={44} />
              <ReferenceLine
                y={SECTIONAL_MIN}
                stroke={colors.axis}
                strokeDasharray="4 4"
                label={{ value: `Điểm liệt ${SECTIONAL_MIN}`, position: 'insideTopRight', fill: colors.axis, fontSize: 12 }}
              />
              <Tooltip
                cursor={{ stroke: colors.grid }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as Point | undefined;
                  if (!active || !p) return null;
                  return (
                    <div className="rounded-[var(--radius-control)] border border-rule-strong bg-surface px-3 py-2 text-sm">
                      <p className="mb-1 text-xs text-ink-muted">{formatDateTime(p.submitted_at)}</p>
                      <p>
                        <span className="font-semibold tabular-nums">{p.score}/120</span>{' '}
                        <span className="text-ink-muted">
                          ({p.correct}/{p.total} câu) · {p.exam_title}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="linear"
                dataKey="score"
                stroke={colors.newWords}
                strokeWidth={2}
                dot={{ r: 4, fill: colors.newWords, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/**
 * Tỷ lệ đúng theo dạng mondai trên toàn bộ lịch sử, thấp đến cao để thấy dạng yếu nhất (FR-EXP-08),
 * kèm thời gian trung bình mỗi câu so với thời gian chuẩn (FR-EXP-09). Bảng có thanh tỷ lệ trong ô.
 */
function ByTypeTable({ rows }: { rows: ExamStats['by_type'] }) {
  return (
    <ChartCard title="Theo dạng câu hỏi" description="Dạng yếu nhất ở trên cùng. Thời gian chuẩn = thời gian phần thi ÷ số câu.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">Tỷ lệ đúng và thời gian mỗi câu theo dạng mondai</caption>
          <thead>
            <tr className="border-b border-rule text-left text-ink-muted">
              <th scope="col" className="py-2 font-medium">Dạng</th>
              <th scope="col" className="w-2/5 py-2 font-medium">Tỷ lệ đúng</th>
              <th scope="col" className="py-2 text-right font-medium">Mỗi câu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const percent = Math.round(r.accuracy * 100);
              const slow = r.avg_time_ms !== null && r.standard_time_ms !== null && r.avg_time_ms > r.standard_time_ms;
              return (
                <tr key={r.type_id} className="border-b border-rule">
                  <th scope="row" className="py-2 pr-3 text-left font-normal">
                    <span lang="ja" className="font-jp">
                      {r.label_ja}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {r.name_vi} · {r.answered} câu
                    </span>
                  </th>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div aria-hidden="true" className="h-2 flex-1 bg-rule">
                        <div className="h-full rounded-r-[4px] bg-son" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="w-20 shrink-0 text-right tabular-nums">
                        {percent}% <span className="text-ink-muted">({r.correct}/{r.answered})</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {r.avg_time_ms !== null ? (
                      <span className={slow ? 'font-semibold text-son-ink' : undefined}>{formatMs(r.avg_time_ms)}</span>
                    ) : (
                      '–'
                    )}
                    {r.standard_time_ms !== null && (
                      <span className="block text-xs text-ink-muted">chuẩn {formatMs(r.standard_time_ms)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

/** Phần "Luyện đề" của trang Tiến độ (FR-EXP-08, 09). */
export function ExamStatsSection() {
  const stats = useExamStats();
  return (
    <section aria-labelledby="exam-stats" className="flex flex-col gap-4">
      <h2 id="exam-stats" className="text-[22px]">
        Luyện đề
      </h2>
      {stats.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : stats.isError ? (
        <ErrorState title="Chưa tải được thống kê luyện đề" onRetry={() => void stats.refetch()} retrying={stats.isRefetching} />
      ) : stats.data.attempts.length === 0 && stats.data.by_type.length === 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-rule bg-surface p-4">
          <p className="flex-1 text-ink-muted">Chưa có lượt luyện đề nào. Làm một đề để biết mình yếu ở dạng nào.</p>
          <Link to="/de-thi" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            Luyện đề
          </Link>
        </div>
      ) : (
        <>
          {stats.data.attempts.length > 0 && <ScoreChart attempts={stats.data.attempts} />}
          {stats.data.by_type.length > 0 && <ByTypeTable rows={stats.data.by_type} />}
        </>
      )}
    </section>
  );
}
