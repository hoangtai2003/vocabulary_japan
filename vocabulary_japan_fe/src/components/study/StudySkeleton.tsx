import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';

/** Skeleton đúng hình phiên học: tiêu đề, thanh tiến độ, thẻ vuông, nút. */
export function StudySkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-6 w-full" />
      <Skeleton className="mx-auto aspect-square w-full max-w-[480px]" />
      <Skeleton className="mx-auto h-14 w-full max-w-[480px]" />
    </SkeletonGroup>
  );
}
