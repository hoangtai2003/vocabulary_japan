import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';

/** Skeleton đúng hình bảng từ vựng quản trị. */
export function AdminTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <SkeletonGroup
      label="Đang tải bảng từ vựng"
      className="overflow-hidden rounded-[var(--radius-card)] border border-rule bg-surface"
    >
      <div className="flex gap-6 border-b border-rule bg-paper px-4 py-3">
        {['w-10', 'w-24', 'w-32', 'w-20', 'w-12'].map((w) => (
          <Skeleton key={w} className={`h-4 ${w}`} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-6 border-b border-rule px-4 py-3 last:border-0"
        >
          <Skeleton className="h-4 w-10" />
          <div className="flex w-24 flex-col gap-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-14" />
          </div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="ml-auto size-8" />
        </div>
      ))}
    </SkeletonGroup>
  );
}
