import { useDueReviews } from '@/hooks/queries/useReviews';
import { cn } from '@/utils/cn';

/** Số thẻ cần ôn trong ô vuông son nhỏ. Không hiện khi bằng 0 hoặc chưa tải xong. */
export function DueBadge({ className }: { className?: string }) {
  const { data } = useDueReviews();
  const total = data?.total ?? 0;
  if (total === 0) return null;
  return (
    <span
      aria-label={`${total} thẻ cần ôn`}
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center bg-son px-1 text-[11px] font-semibold tabular-nums leading-none text-on-son',
        className,
      )}
    >
      {total > 99 ? '99+' : total}
    </span>
  );
}
