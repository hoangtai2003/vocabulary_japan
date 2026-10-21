import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';

/** Skeleton màn câu hỏi: tiến độ, ô đề, bốn đáp án. */
export function QuizSkeleton() {
  return (
    <SkeletonGroup
      label="Đang soạn đề quiz"
      className="mx-auto flex w-full max-w-[560px] flex-col gap-5"
    >
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-44 w-full" />
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </SkeletonGroup>
  );
}
