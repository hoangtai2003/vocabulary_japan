import { Check, Flag, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isApiError } from '@/api/client';
import { AnswerGrid } from '@/components/exam/AnswerGrid';
import { ExplanationView } from '@/components/exam/ExplanationView';
import { Markup } from '@/components/exam/Markup';
import { PassageView } from '@/components/exam/PassageView';
import { QuestionNumber, QuestionView } from '@/components/exam/QuestionView';
import { ScoreCard } from '@/components/exam/ScoreCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useAttemptResult } from '@/hooks/queries/useExams';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AttemptResult, ResultMondai, ResultQuestion } from '@/types/exam';
import { cn } from '@/utils/cn';
import { formatDateTime, formatDuration, MODE_LABELS } from '@/utils/examFormat';
import { plainText } from '@/utils/markup';

type Filter = 'all' | 'wrong' | 'flagged';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'wrong', label: 'Chỉ câu sai' },
  { value: 'flagged', label: 'Chỉ câu đã đánh dấu' },
];

const keep = (filter: Filter) => (q: ResultQuestion) =>
  filter === 'all' ? true : filter === 'wrong' ? !q.is_correct : q.flagged;

/** Kết quả theo phần thi và theo mondai, kèm thời gian đã dùng (FR-RES-02). */
function Breakdown({ result }: { result: AttemptResult }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {result.sections.map((s) => (
        <Card key={s.id} className="p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 lang="ja" className="font-jp text-base font-semibold">
              {s.title}
            </h3>
            <p className="font-semibold tabular-nums">
              {s.correct}/{s.total}
            </p>
          </div>
          {s.time_used_seconds !== null && (
            <p className="text-sm text-ink-muted">
              Thời gian: {formatDuration(s.time_used_seconds)}
              {s.duration_minutes ? ` / ${s.duration_minutes} phút` : ''}
            </p>
          )}
          <table className="mt-2 w-full text-sm">
            <caption className="sr-only">Số câu đúng theo mondai của {s.title}</caption>
            <tbody>
              {s.mondai.map((m) => (
                <tr key={m.id} className="border-t border-rule">
                  <th scope="row" className="py-1 text-left font-normal">
                    <span lang="ja">問題{m.number}</span>
                    {m.type_name_vi && <span className="text-ink-muted"> · {m.type_name_vi}</span>}
                  </th>
                  <td className={cn('py-1 text-right tabular-nums', m.correct < m.total && 'text-son-ink')}>
                    {m.correct}/{m.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}

function QuestionReview({ question }: { question: ResultQuestion }) {
  const [open, setOpen] = useState(false);
  const preview =
    question.kind === 'star'
      ? `${plainText(question.star_prefix)} ＿ ＿★＿ ＿ ＿ ${plainText(question.star_suffix)}`
      : plainText(question.prompt) || `Chỗ trống số ${question.number}`;
  return (
    <li className="border-b border-rule">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 py-3 text-left hover:bg-ink/[0.03]"
      >
        <QuestionNumber number={question.number} />
        <span lang="ja" className="min-w-0 flex-1 truncate font-jp">
          {preview}
        </span>
        {question.flagged && <Flag aria-label="Đã đánh dấu" className="size-4 shrink-0 fill-son text-son" />}
        <span className="shrink-0 text-sm tabular-nums">
          <span className="text-ink-muted">Chọn </span>
          {question.chosen ?? '–'}
          <span className="text-ink-muted"> · Đúng </span>
          {question.correct_option ?? '–'}
        </span>
        {question.is_correct ? (
          <Check aria-label="Đúng" className="size-5 shrink-0 text-moss-ink" />
        ) : (
          <X aria-label="Sai" className="size-5 shrink-0 text-son-ink" />
        )}
      </button>
      {open && (
        <div className="flex flex-col gap-4 pb-5 pl-1 sm:pl-10">
          <QuestionView question={question} selected={question.chosen} correct={question.correct_option} />
          <div className="rounded-[var(--radius-card)] border border-rule bg-surface p-4">
            <ExplanationView
              kind={question.kind}
              options={question.options}
              correctOption={question.correct_option}
              starOrder={question.star_order}
              starPosition={question.star_position}
              explanation={question.explanation}
              learnerNote={question.learner_note}
            />
          </div>
        </div>
      )}
    </li>
  );
}

/** Một mondai trong danh sách lời giải: hướng dẫn, mẹo làm bài (FR-EXP-05), bài đọc, các câu. */
function MondaiReview({ mondai, filter }: { mondai: ResultMondai; filter: Filter }) {
  const questions = mondai.questions.filter(keep(filter));
  if (questions.length === 0) return null;
  return (
    <section aria-label={`問題${mondai.number}`} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 lang="ja" className="font-jp text-base font-semibold">
          問題{mondai.number}
          {mondai.type_name_vi && <span className="ml-2 font-sans text-sm font-normal text-ink-muted">{mondai.type_name_vi}</span>}
        </h3>
        {mondai.instructions && <Markup source={mondai.instructions} className="text-[15px] text-ink-muted" />}
      </div>
      {mondai.tip.trim() && (
        <details className="rounded-[var(--radius-control)] border border-rule bg-surface px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold">Mẹo làm 問題{mondai.number}</summary>
          <Markup source={mondai.tip} lang="vi" className="mt-2 text-[15px]" />
        </details>
      )}
      {mondai.passages.map((p) => {
        const own = questions.filter((q) => q.passage_id === p.id);
        if (own.length === 0) return null;
        return (
          <div key={p.id} className="flex flex-col gap-2">
            <details className="rounded-[var(--radius-card)] border border-rule px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold">
                Bài đọc {p.label || ''} · câu {own.map((q) => q.number).join(', ')}
              </summary>
              <PassageView passage={p} showSolutionToggles className="mt-3" />
            </details>
          </div>
        );
      })}
      <ul className="border-t border-rule">
        {questions.map((q) => (
          <QuestionReview key={q.id} question={q} />
        ))}
      </ul>
    </section>
  );
}

/** /de-thi/ket-qua/:attemptId (FR-RES, FR-EXP): điểm, kết quả theo phần, bảng đáp án, lời giải. */
export default function ExamResultPage() {
  const { attemptId = '' } = useParams();
  const result = useAttemptResult(attemptId);
  const [filter, setFilter] = useState<Filter>('all');
  useDocumentTitle('Kết quả');

  if (result.isPending) {
    return (
      <SkeletonGroup label="Đang tải kết quả" className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </SkeletonGroup>
    );
  }
  if (result.isError) {
    const code = isApiError(result.error) ? result.error.status : 0;
    if (code === 404 || code === 400) {
      return (
        <EmptyState
          mark="無"
          title={code === 400 ? 'Lượt làm chưa nộp' : 'Không tìm thấy kết quả'}
          description={code === 400 ? 'Nộp bài xong mới xem được kết quả.' : 'Lượt làm này không tồn tại hoặc không phải của bạn.'}
          action={
            <Link to={code === 400 ? `/de-thi/lam/${attemptId}` : '/de-thi'} className={buttonClasses()}>
              {code === 400 ? 'Quay lại làm bài' : 'Về danh sách đề'}
            </Link>
          }
        />
      );
    }
    return <ErrorState title="Chưa tải được kết quả" onRetry={() => void result.refetch()} retrying={result.isRefetching} />;
  }

  const r = result.data;
  const wrongCount = r.total - r.correct;
  const backTo = r.exam ? `/de-thi/${r.exam.id}` : r.mode === 'wrong_review' ? '/de-thi/lam-lai' : '/de-thi';
  const multiExam = new Set(r.sections.map((s) => s.exam_id)).size > 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={r.exam?.title ?? MODE_LABELS[r.mode]}
        description={`${MODE_LABELS[r.mode]} · nộp ${formatDateTime(r.submitted_at)}`}
        actions={
          <Link to={backTo} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            {r.exam ? 'Về trang đề' : 'Quay lại'}
          </Link>
        }
      />

      {r.regraded_at && (
        <p role="note" className="border-l-[3px] border-rule-strong bg-surface px-3 py-2 text-[15px]">
          Đề đã được cập nhật sau lần làm này. Kết quả bên dưới đã được chấm lại theo đáp án mới.
        </p>
      )}

      {r.score ? (
        <ScoreCard score={r.score} correct={r.correct} total={r.total} />
      ) : (
        <Card className="p-4">
          <p className="text-sm text-ink-muted">Kết quả</p>
          <p className="font-display text-[36px] font-semibold leading-tight tabular-nums">
            {r.correct}/{r.total} <span className="text-lg text-ink-muted">câu đúng</span>
          </p>
        </Card>
      )}

      <section aria-labelledby="breakdown" className="flex flex-col gap-3">
        <h2 id="breakdown" className="text-[22px]">
          Theo phần thi
        </h2>
        <Breakdown result={r} />
      </section>

      <section aria-labelledby="grid" className="flex flex-col gap-3">
        <h2 id="grid" className="text-[22px]">
          Bảng đáp án
        </h2>
        <AnswerGrid sections={r.sections} />
      </section>

      <section aria-labelledby="review" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="review" className="text-[22px]">
            Lời giải
          </h2>
          <div role="group" aria-label="Lọc câu hỏi" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'h-9 rounded-[var(--radius-control)] border px-3 text-sm font-medium',
                  filter === f.value ? 'border-ink bg-ink text-paper' : 'border-rule-strong bg-surface hover:border-ink',
                )}
              >
                {f.label}
                {f.value === 'wrong' && <span className="ml-1 tabular-nums">({wrongCount})</span>}
              </button>
            ))}
          </div>
        </div>
        {r.sections.map((s) => {
          const visible = s.mondai.some((m) => m.questions.some(keep(filter)));
          if (!visible) return null;
          return (
            <div key={s.id} className="flex flex-col gap-5">
              <h3 lang="ja" className="border-b-2 border-ink pb-1 font-jp text-lg font-semibold">
                {s.title}
                {multiExam && <span className="ml-2 font-sans text-sm font-normal text-ink-muted">{s.exam_title}</span>}
              </h3>
              {s.mondai.map((m) => (
                <MondaiReview key={m.id} mondai={m} filter={filter} />
              ))}
            </div>
          );
        })}
        {r.sections.every((s) => s.mondai.every((m) => !m.questions.some(keep(filter)))) && (
          <p className="text-ink-muted">{filter === 'wrong' ? 'Không có câu sai nào. Giỏi lắm!' : 'Không có câu nào được đánh dấu.'}</p>
        )}
      </section>
    </div>
  );
}
