import { Link } from 'react-router-dom';
import { StudySession } from '@/components/study/StudySession';
import { StudySkeleton } from '@/components/study/StudySkeleton';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useToday } from '@/hooks/queries/useToday';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSessionStore } from '@/stores/sessionStore';

/** /hoc: học lần lượt các từ mới hôm nay chưa học. */
export default function LearnPage() {
  useDocumentTitle('Học từ mới');
  const { user } = useAuth();
  const today = useToday();
  // Khi phiên đã chạy, giữ nguyên phiên dù danh sách hôm nay được tải lại sau mỗi lần chấm.
  const sessionActive = useSessionStore((s) => s.kind === 'learn');

  if (today.isPending) return <StudySkeleton label="Đang chuẩn bị thẻ từ mới" />;

  if (today.isError) {
    return (
      <>
        <h1 className="mb-6 text-[28px]">Học từ mới</h1>
        <ErrorState
          title="Chưa tải được từ mới hôm nay"
          onRetry={() => void today.refetch()}
          retrying={today.isRefetching}
        />
      </>
    );
  }

  const remaining = today.data.new_words.filter((w) => w.status === 'new');

  if (!sessionActive && remaining.length === 0) {
    const finished = today.data.new_words.length > 0;
    return (
      <EmptyState
        mark={finished ? '済' : '尽'}
        title={
          finished
            ? 'Bạn đã học xong từ mới hôm nay'
            : `Không còn từ mới ở cấp độ ${user?.settings.level ?? ''}`
        }
        description={
          finished
            ? 'Ôn lại các từ đến hạn để nhớ lâu hơn. Ngày mai sẽ có từ mới.'
            : 'Đổi cấp độ trong Hồ sơ để nhận từ mới mỗi ngày.'
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {finished ? (
              <Link to="/on-tap" className={buttonClasses()}>
                Sang Ôn tập
              </Link>
            ) : (
              <Link to="/ho-so" className={buttonClasses()}>
                Đổi cấp độ
              </Link>
            )}
            <Link to="/" className={buttonClasses({ variant: 'secondary' })}>
              Về Hôm nay
            </Link>
          </div>
        }
      />
    );
  }

  return <StudySession kind="learn" title="Học từ mới" words={remaining} />;
}
