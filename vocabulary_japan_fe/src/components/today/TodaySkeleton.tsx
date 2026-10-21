import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';

/** Skeleton đúng hình trang Hôm nay: ngày, lời chào, hàng ô, nút, thẻ cần ôn, danh sách. */
export function TodaySkeleton() {
  return (
    <SkeletonGroup label="Đang tải trang Hôm nay" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <div className="flex gap-1">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-square max-w-8 flex-1" />
          ))}
        </div>
        <Skeleton className="mt-2 h-12 w-full" />
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="flex flex-col">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex h-14 items-center gap-4 border-b border-rule">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}
