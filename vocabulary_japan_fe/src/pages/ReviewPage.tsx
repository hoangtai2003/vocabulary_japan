import { Link } from 'react-router-dom';
import { StudySession } from '@/components/study/StudySession';
import { StudySkeleton } from '@/components/study/StudySkeleton';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDueReviews } from '@/hooks/queries/useReviews';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSessionStore } from '@/stores/sessionStore';
import { formatNextReview } from '@/utils/format';

/** /on-tap: ôn các từ đến hạn, quá hạn lâu nhất trước. */
export default function ReviewPage() {
  useDocumentTitle('Ôn tập');
  const due = useDueReviews();
  const sessionActive = useSessionStore((s) => s.kind === 'review');

  if (due.isPending) return <StudySkeleton label="Đang chuẩn bị thẻ ôn tập" />;

  if (due.isError) {
    return (
      <>
        <h1 className="mb-6 text-[28px]">Ôn tập</h1>
        <ErrorState
          title="Chưa tải được danh sách cần ôn"
          onRetry={() => void due.refetch()}
          retrying={due.isRefetching}
        />
      </>
    );
  }

  const { items, total, next_due_at: nextDueAt } = due.data;

  if (!sessionActive && items.length === 0) {
    return (
      <EmptyState
        mark="閑"
        title="Chưa có từ nào đến hạn"
        description={
          nextDueAt
            ? `Lần ôn tiếp theo: ${formatNextReview(nextDueAt, new Date())}. Học thêm từ mới trong lúc chờ nhé?`
            : 'Bạn chưa có từ nào trong lịch ôn. Học vài từ mới để bắt đầu.'
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/hoc" className={buttonClasses()}>
              Học từ mới
            </Link>
            <Link to="/quiz" className={buttonClasses({ variant: 'secondary' })}>
              Làm quiz
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <StudySession
      kind="review"
      title="Ôn tập"
      words={items}
      note={
        total > items.length ? `Phiên này gồm ${items.length} trên ${total} từ đến hạn.` : undefined
      }
    />
  );
}
