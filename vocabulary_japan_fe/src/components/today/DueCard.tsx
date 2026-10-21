import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface DueCardProps {
  total: number | undefined;
  /** false khi người dùng chưa học từ nào (chưa có gì để ôn). */
  hasLearned: boolean;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

/** Thẻ "Cần ôn": cả thẻ là liên kết tới /on-tap; bằng 0 thì báo đã ôn xong. */
export function DueCard({ total, hasLearned, loading, error, onRetry }: DueCardProps) {
  const box = 'flex min-h-16 items-center gap-4 rounded-[var(--radius-card)] border px-4 py-3';

  if (loading) {
    return (
      <div className={`${box} border-rule bg-surface`}>
        <Skeleton className="h-5 w-48" />
      </div>
    );
  }

  if (error || total === undefined) {
    return (
      <div role="alert" className={`${box} justify-between border-rule bg-surface`}>
        <p className="text-sm text-ink-muted">Chưa tải được số từ cần ôn.</p>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (total === 0 && !hasLearned) {
    return (
      <div className={`${box} border-rule bg-surface`}>
        <span aria-hidden="true" className="size-2.5 shrink-0 border border-rule-strong" />
        <p className="text-ink-muted">Chưa có từ nào cần ôn. Học vài từ mới, lịch ôn sẽ tự đến.</p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className={`${box} border-rule bg-surface`}>
        <span aria-hidden="true" className="size-2.5 shrink-0 bg-moss" />
        <p>
          <span className="font-semibold text-moss-ink">Bạn đã ôn xong.</span>{' '}
          <span className="text-ink-muted">Không còn từ nào đến hạn hôm nay.</span>
        </p>
      </div>
    );
  }

  return (
    <Link to="/on-tap" className={`${box} group border-rule-strong bg-surface hover:border-ink`}>
      <span aria-hidden="true" className="size-2.5 shrink-0 bg-son" />
      <p className="flex-1">
        Bạn còn <span className="font-semibold tabular-nums">{total} từ</span> cần ôn
      </p>
      <ChevronRight
        aria-hidden="true"
        className="size-5 text-ink-muted transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
