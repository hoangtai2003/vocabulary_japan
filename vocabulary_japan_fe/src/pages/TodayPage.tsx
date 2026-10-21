import { Link } from 'react-router-dom';
import { DailyProgress } from '@/components/today/DailyProgress';
import { DueCard } from '@/components/today/DueCard';
import { TodaySkeleton } from '@/components/today/TodaySkeleton';
import { TodayWordList } from '@/components/today/TodayWordList';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDueReviews } from '@/hooks/queries/useReviews';
import { useStatsOverview } from '@/hooks/queries/useStats';
import { useToday } from '@/hooks/queries/useToday';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { StatsOverview } from '@/types/api';
import { formatLongDate } from '@/utils/format';

function streakSentence(stats: StatsOverview): string {
  const studiedToday = stats.today.new_learned + stats.today.reviewed > 0;
  if (stats.streak_days === 0) return 'Học một thẻ hôm nay để bắt đầu chuỗi ngày học mới.';
  if (studiedToday) return `Bạn đã học ${stats.streak_days} ngày liền.`;
  return `Bạn đã học ${stats.streak_days} ngày liền. Học hôm nay để giữ chuỗi nhé.`;
}

/** Nút chính đổi theo tiến độ: học tiếp → ôn tập → quiz. */
function PrimaryAction({
  remaining,
  learnedToday,
  dueTotal,
}: {
  remaining: number;
  learnedToday: number;
  dueTotal: number | undefined;
}) {
  const className = buttonClasses({ size: 'lg', block: true });
  if (remaining > 0) {
    return (
      <Link to="/hoc" className={className}>
        {learnedToday > 0 ? `Học tiếp · còn ${remaining} từ` : 'Bắt đầu học'}
      </Link>
    );
  }
  if (dueTotal && dueTotal > 0) {
    return (
      <Link to="/on-tap" className={className}>
        Ôn tập {dueTotal} từ
      </Link>
    );
  }
  return (
    <Link to="/quiz" className={className}>
      Làm quiz
    </Link>
  );
}

export default function TodayPage() {
  useDocumentTitle('Hôm nay');
  const { user } = useAuth();
  const today = useToday();
  const stats = useStatsOverview();
  const due = useDueReviews();

  if (today.isPending) return <TodaySkeleton />;

  if (today.isError) {
    return (
      <>
        <h1 className="mb-6 text-[28px]">Hôm nay</h1>
        <ErrorState
          title="Chưa tải được bài học hôm nay"
          message="Kiểm tra kết nối mạng rồi thử lại."
          onRetry={() => void today.refetch()}
          retrying={today.isRefetching}
        />
      </>
    );
  }

  const { date, goal, new_words: words, learned_today: learnedToday } = today.data;
  const remaining = words.filter((w) => w.status === 'new').length;
  const level = user?.settings.level ?? 'N5';
  const goalReached = remaining === 0 && words.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm text-ink-muted">{formatLongDate(date)}</p>
        <h1 className="mt-1 text-[28px] md:text-[34px]">Chào {user?.display_name}</h1>
        <div className="mt-1 min-h-6 text-ink-muted">
          {stats.isPending ? (
            <Skeleton className="mt-1 h-5 w-60" />
          ) : stats.data ? (
            <p>{streakSentence(stats.data)}</p>
          ) : null}
        </div>
      </header>

      {words.length === 0 ? (
        <EmptyState
          mark="尽"
          title={`Bạn đã học hết từ ${level}`}
          description="Đổi cấp độ trong Hồ sơ để nhận từ mới mỗi ngày. Trong lúc đó, ôn lại từ cũ cũng rất tốt."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/ho-so" className={buttonClasses()}>
                Đổi cấp độ
              </Link>
              <Link to="/quiz" className={buttonClasses({ variant: 'secondary' })}>
                Làm quiz
              </Link>
            </div>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <DailyProgress learned={learnedToday} goal={goal} />
          {goalReached && (
            <p className="font-medium text-moss-ink">Bạn đã học xong từ mới hôm nay.</p>
          )}
          <PrimaryAction
            remaining={remaining}
            learnedToday={learnedToday}
            dueTotal={due.data?.total}
          />
        </div>
      )}

      <DueCard
        total={due.data?.total}
        hasLearned={(stats.data?.total_learned ?? 1) > 0}
        loading={due.isPending}
        error={due.isError}
        onRetry={() => void due.refetch()}
      />

      {words.length > 0 && (
        <section aria-labelledby="today-words">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 id="today-words" className="text-xl">
              Danh sách hôm nay
            </h2>
            <p className="text-sm text-ink-muted">Cấp độ {level}</p>
          </div>
          <TodayWordList words={words} />
          {words.length < goal && (
            <p className="mt-3 text-sm text-ink-muted">
              Cấp độ {level} chỉ còn {words.length} từ mới cho hôm nay.{' '}
              <Link to="/ho-so" className="font-semibold text-son-ink underline underline-offset-4">
                Đổi cấp độ
              </Link>{' '}
              để có thêm.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
