import { ProgressBar } from '@/components/ui/ProgressBar';

/** Tiến độ trong ngày: số từ mới đã học / mục tiêu, vẽ bằng hàng ô genkō. */
export function DailyProgress({ learned, goal }: { learned: number; goal: number }) {
  const shown = Math.min(learned, goal);
  return (
    <section aria-labelledby="daily-progress">
      <div className="mb-2 flex items-baseline gap-3">
        <h2 id="daily-progress" className="font-sans text-base font-semibold">
          Từ mới hôm nay
        </h2>
        <p className="text-sm tabular-nums text-ink-muted">
          <span className="font-semibold text-ink">{shown}</span>/{goal} từ
        </p>
      </div>
      <ProgressBar
        value={shown}
        max={goal}
        label="Tiến độ hôm nay"
        valueText={`Đã học ${shown} trên ${goal} từ mới`}
      />
    </section>
  );
}
