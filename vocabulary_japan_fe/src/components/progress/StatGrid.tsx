import { Skeleton } from '@/components/ui/Skeleton';
import type { StatsOverview } from '@/types/api';

interface Stat {
  label: string;
  value: number;
  unit: string;
  note?: string;
}

/** Bốn chỉ số: streak hiện tại, streak dài nhất, tổng từ đã học, từ đã thuộc. */
export function StatGrid({ stats }: { stats: StatsOverview | undefined }) {
  const items: Stat[] | null = stats
    ? [
        { label: 'Streak hiện tại', value: stats.streak_days, unit: 'ngày' },
        { label: 'Streak dài nhất', value: stats.longest_streak, unit: 'ngày' },
        { label: 'Từ đã học', value: stats.total_learned, unit: 'từ' },
        {
          label: 'Đã thuộc',
          value: stats.mastered,
          unit: 'từ',
          note: 'Khoảng ôn từ 21 ngày',
        },
      ]
    : null;

  return (
    <dl className="grid grid-cols-2 border-l border-t border-rule md:grid-cols-4">
      {(items ?? Array.from({ length: 4 }, () => null)).map((item, i) => (
        <div
          key={item?.label ?? i}
          className="flex flex-col gap-1 border-b border-r border-rule bg-surface px-4 py-3"
        >
          {item ? (
            <>
              <dt className="text-sm text-ink-muted">{item.label}</dt>
              <dd className="flex items-baseline gap-1.5">
                <span className="text-[32px] font-semibold leading-tight">{item.value}</span>
                <span className="text-sm text-ink-muted">{item.unit}</span>
              </dd>
              {item.note && <dd className="text-xs text-ink-muted">{item.note}</dd>}
            </>
          ) : (
            <>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-16" />
            </>
          )}
        </div>
      ))}
    </dl>
  );
}
