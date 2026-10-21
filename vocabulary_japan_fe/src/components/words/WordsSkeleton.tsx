import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';

/** Skeleton đúng hình danh sách từ. */
export function WordsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <SkeletonGroup label="Đang tải danh sách từ" className="border-t border-rule">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex min-h-16 items-center gap-4 border-b border-rule py-2.5 pl-3 pr-2"
        >
          <div className="flex w-24 shrink-0 flex-col gap-1.5 sm:w-32">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="size-6" />
        </div>
      ))}
    </SkeletonGroup>
  );
}
