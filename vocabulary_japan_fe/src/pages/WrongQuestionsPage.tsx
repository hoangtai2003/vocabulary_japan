import { Link, useNavigate } from 'react-router-dom';
import { isApiError } from '@/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useStartWrongReview, useWrongQuestions } from '@/hooks/queries/useExams';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { WrongQuestionItem } from '@/types/exam';
import { formatDateTime } from '@/utils/examFormat';

/** Mỗi lượt làm lại tối đa 20 câu, mới sai gần nhất trước (API_CONTRACT.md phụ lục J). */
const REVIEW_LIMIT = 20;

function Streak({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`Đúng liên tiếp ${value}/2 lần`}>
      {[0, 1].map((i) => (
        <span key={i} aria-hidden="true" className={i < value ? 'size-2.5 bg-moss' : 'size-2.5 border border-rule-strong'} />
      ))}
    </span>
  );
}

/**
 * /de-thi/lam-lai (FR-EXAM-07): câu đã trả lời sai ở mọi lượt; làm lại ở chế độ không giới hạn
 * giờ, đúng hai lần liên tiếp thì câu rời danh sách.
 */
export default function WrongQuestionsPage() {
  useDocumentTitle('Làm lại câu sai');
  const navigate = useNavigate();
  const wrong = useWrongQuestions();
  const start = useStartWrongReview();

  const begin = () =>
    start.mutate(
      { limit: REVIEW_LIMIT },
      { onSuccess: ({ attempt_id }) => navigate(`/de-thi/lam/${attempt_id}`) },
    );

  let content;
  if (wrong.isPending) {
    content = (
      <SkeletonGroup label="Đang tải câu sai" className="flex flex-col gap-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </SkeletonGroup>
    );
  } else if (wrong.isError) {
    content = <ErrorState title="Chưa tải được danh sách" onRetry={() => void wrong.refetch()} retrying={wrong.isRefetching} />;
  } else if (wrong.data.total === 0) {
    content = (
      <EmptyState
        mark="正"
        title="Không còn câu nào cần làm lại"
        description="Câu trả lời sai khi thi thử hoặc luyện tập sẽ vào đây."
        action={
          <Link to="/de-thi" className={buttonClasses()}>
            Luyện đề
          </Link>
        }
      />
    );
  } else {
    const groups = new Map<string, WrongQuestionItem[]>();
    for (const item of wrong.data.items) groups.set(item.exam_title, [...(groups.get(item.exam_title) ?? []), item]);
    content = (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={begin} loading={start.isPending}>
            Làm lại {Math.min(REVIEW_LIMIT, wrong.data.total)} câu
          </Button>
          <p className="text-sm text-ink-muted">Đang có {wrong.data.total} câu. Mỗi lượt lấy tối đa {REVIEW_LIMIT} câu sai gần nhất.</p>
        </div>
        {start.isError && (
          <ErrorState title="Chưa tạo được lượt làm lại" message={isApiError(start.error) ? start.error.message : undefined} />
        )}
        {[...groups.entries()].map(([title, items]) => (
          <section key={title} aria-label={title}>
            <h2 className="mb-2 text-lg">{title}</h2>
            <ul className="divide-y divide-rule border-y border-rule">
              {items.map((item) => (
                <li key={item.question_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <span className="inline-flex h-7 min-w-7 items-center justify-center border border-ink px-1 text-sm font-semibold tabular-nums">
                    {item.number ?? '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p lang="ja" className="truncate font-jp">
                      {item.prompt_preview}
                    </p>
                    <p className="text-xs text-ink-muted">
                      <span lang="ja">{item.section_title} · 問題{item.mondai_number}</span>
                      {item.type_name_vi && ` · ${item.type_name_vi}`} · sai lúc {formatDateTime(item.last_wrong_at)}
                    </p>
                  </div>
                  <Streak value={item.correct_streak} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Làm lại câu sai"
        description="Không giới hạn giờ, có lời giải ngay sau mỗi câu."
        actions={
          <Link to="/de-thi" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
            Tất cả đề
          </Link>
        }
      />
      {content}
    </div>
  );
}
