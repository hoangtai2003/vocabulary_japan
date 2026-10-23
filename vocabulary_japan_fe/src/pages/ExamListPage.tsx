import { ChevronRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isApiError } from '@/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Select } from '@/components/ui/Select';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useExamList, usePracticeTypes, useStartByType, useWrongQuestions } from '@/hooks/queries/useExams';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { ExamListItem } from '@/types/exam';
import { JLPT_LEVELS, type JlptLevel } from '@/types/word';
import { cn } from '@/utils/cn';

const BY_TYPE_COUNTS = [5, 10, 20];

function ExamCard({ exam }: { exam: ExamListItem }) {
  return (
    <li>
      <Card className="relative flex flex-col gap-3 p-4 transition-colors hover:border-rule-strong sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-ink px-1.5 text-xs font-semibold">{exam.level}</span>
            {exam.difficulty && <span className="text-xs font-medium text-ink-muted">{exam.difficulty}</span>}
            {exam.in_progress_attempt_id && (
              <span className="bg-son-wash px-1.5 text-xs font-semibold text-son-ink">Đang làm dở</span>
            )}
          </div>
          <h2 className="mt-1 text-xl">
            <Link to={`/de-thi/${exam.id}`} className="after:absolute after:inset-0 after:content-['']">
              {exam.title}
            </Link>
          </h2>
          <p className="text-sm text-ink-muted">
            {exam.question_count} câu · {exam.total_minutes} phút
          </p>
        </div>
        <div className="flex items-center gap-3 sm:text-right">
          <div>
            <p className="text-xs text-ink-muted">Tốt nhất</p>
            {exam.best ? (
              <p className="font-semibold tabular-nums">
                {exam.best.estimated_score !== null ? `${exam.best.estimated_score}/120` : `${exam.best.correct}/${exam.best.total}`}
                <span className="ml-1 text-sm font-normal text-ink-muted">
                  ({exam.best.correct}/{exam.best.total} câu)
                </span>
              </p>
            ) : (
              <p className="text-sm text-ink-muted">Chưa thi thử</p>
            )}
          </div>
          <ChevronRight aria-hidden="true" className="ml-auto size-5 text-ink-muted" />
        </div>
      </Card>
    </li>
  );
}

/** Luyện theo dạng (FR-EXAM-08): chọn dạng mondai và số câu, lấy ngẫu nhiên từ các đề cùng cấp. */
function ByTypeCard({ level }: { level: JlptLevel }) {
  const navigate = useNavigate();
  const types = usePracticeTypes(level);
  const start = useStartByType();
  const [typeId, setTypeId] = useState('');
  const [count, setCount] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const list = types.data ?? [];
  const selected = typeId || list[0]?.id || '';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    start.mutate(
      { level, mondai_type: selected, count },
      {
        onSuccess: ({ attempt_id }) => navigate(`/de-thi/lam/${attempt_id}`),
        onError: (e) => setError(isApiError(e) ? (Object.values(e.fields ?? {})[0] ?? e.message) : 'Chưa tạo được lượt luyện.'),
      },
    );
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div>
        <h3 className="text-lg">Luyện theo dạng</h3>
        <p className="text-sm text-ink-muted">Câu cùng dạng lấy ngẫu nhiên từ mọi đề {level}, không giới hạn giờ.</p>
      </div>
      {types.isPending ? (
        <Skeleton className="h-11 w-full" />
      ) : list.length === 0 ? (
        <p className="text-sm text-ink-muted">Chưa có đề {level} nào để luyện theo dạng.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem]">
            <Select
              label="Dạng mondai"
              value={selected}
              onChange={(e) => setTypeId(e.target.value)}
              options={list.map((t) => ({
                value: t.id,
                label: `${t.label_ja} · ${t.name_vi} (${t.question_count} câu)`,
              }))}
            />
            <Select
              label="Số câu"
              value={String(count)}
              onChange={(e) => setCount(Number(e.target.value))}
              options={BY_TYPE_COUNTS.map((n) => ({ value: String(n), label: `${n} câu` }))}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-son-ink">
              {error}
            </p>
          )}
          <Button type="submit" variant="secondary" loading={start.isPending} className="self-start">
            Bắt đầu luyện
          </Button>
        </form>
      )}
    </Card>
  );
}

function WrongCard() {
  const wrong = useWrongQuestions();
  const total = wrong.data?.total ?? 0;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div>
        <h3 className="text-lg">Làm lại câu sai</h3>
        <p className="text-sm text-ink-muted">
          {wrong.isPending
            ? 'Đang đếm câu sai…'
            : total > 0
              ? `${total} câu đang chờ. Làm đúng hai lần liên tiếp thì câu rời danh sách.`
              : 'Chưa có câu sai nào. Câu trả lời sai sẽ vào đây.'}
        </p>
      </div>
      <Link
        to="/de-thi/lam-lai"
        className={cn(buttonClasses({ variant: 'secondary' }), 'self-start', total === 0 && 'pointer-events-none opacity-55')}
        aria-disabled={total === 0 || undefined}
      >
        Xem câu sai
      </Link>
    </Card>
  );
}

/** /de-thi (FR-EXAM-01): đề đã xuất bản theo cấp, kết quả tốt nhất, và lối vào các chế độ luyện. */
export default function ExamListPage() {
  useDocumentTitle('Luyện đề');
  const { user } = useAuth();
  const [level, setLevel] = useState<JlptLevel>(user?.settings.level ?? 'N4');
  const exams = useExamList(level);

  let content;
  if (exams.isPending) {
    content = (
      <SkeletonGroup label="Đang tải danh sách đề" className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </SkeletonGroup>
    );
  } else if (exams.isError) {
    content = <ErrorState title="Chưa tải được danh sách đề" onRetry={() => void exams.refetch()} retrying={exams.isRefetching} />;
  } else if (exams.data.length === 0) {
    content = (
      <EmptyState mark="試" title={`Chưa có đề ${level}`} description="Đề mới sẽ hiện ở đây khi được xuất bản. Thử cấp độ khác nhé." />
    );
  } else {
    content = (
      <ul className="flex flex-col gap-3">
        {exams.data.map((exam) => (
          <ExamCard key={exam.id} exam={exam} />
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Luyện đề JLPT"
        description="Thi thử trọn đề có bấm giờ, luyện từng phần, xem lời giải tiếng Việt."
      />
      <div role="group" aria-label="Cấp độ" className="flex gap-2">
        {JLPT_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={l === level}
            onClick={() => setLevel(l)}
            className={cn(
              'h-9 min-w-14 rounded-[var(--radius-control)] border px-3 text-sm font-semibold',
              l === level ? 'border-ink bg-ink text-paper' : 'border-rule-strong bg-surface hover:border-ink',
            )}
          >
            {l}
          </button>
        ))}
      </div>
      <section aria-label="Danh sách đề">{content}</section>
      <section aria-labelledby="practice-heading" className="flex flex-col gap-3">
        <h2 id="practice-heading" className="text-[22px]">
          Luyện tập
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <WrongCard />
          <ByTypeCard level={level} />
        </div>
      </section>
    </div>
  );
}
