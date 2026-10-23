import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Flag } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { examsApi } from '@/api/examsApi';
import { isApiError } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { ExplanationView } from '@/components/exam/ExplanationView';
import { Markup } from '@/components/exam/Markup';
import { PassageView } from '@/components/exam/PassageView';
import { QuestionView } from '@/components/exam/QuestionView';
import { QuestionNavPanel } from '@/components/exam/run/QuestionNavPanel';
import { RunTopBar, WARNING_MS } from '@/components/exam/run/RunTopBar';
import { SectionIntro } from '@/components/exam/run/SectionIntro';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { Modal } from '@/components/ui/Modal';
import { useAttemptState, useInvalidateExamData } from '@/hooks/queries/useExams';
import { useCountdown } from '@/hooks/useCountdown';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useExamRunner, type RunnerItem } from '@/hooks/useExamRunner';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { toast } from '@/stores/toastStore';
import type { AttemptState } from '@/types/exam';
import { cn } from '@/utils/cn';

const SPLIT_QUERY = '(min-width: 1024px)';

/** Nơi quay về khi thoát: trang đề (nếu lượt thuộc một đề), hoặc trang luyện tập. */
const exitPath = (attempt: AttemptState) =>
  attempt.exam ? `/de-thi/${attempt.exam.id}` : attempt.mode === 'wrong_review' ? '/de-thi/lam-lai' : '/de-thi';

export default function ExamRunPage() {
  const { attemptId = '' } = useParams();
  const query = useAttemptState(attemptId);
  useDocumentTitle('Làm bài');

  if (query.isPending) return <FullPageLoader />;
  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.status === 404;
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        {notFound ? (
          <EmptyState
            mark="無"
            title="Không tìm thấy lượt làm"
            description="Lượt làm này không tồn tại hoặc không phải của bạn."
            action={
              <Link to="/de-thi" className={buttonClasses()}>
                Về danh sách đề
              </Link>
            }
          />
        ) : (
          <ErrorState title="Chưa tải được bài làm" onRetry={() => void query.refetch()} retrying={query.isRefetching} />
        )}
      </div>
    );
  }
  const attempt = query.data;
  if (attempt.status === 'submitted') return <Navigate to={`/de-thi/ket-qua/${attempt.id}`} replace />;
  if (attempt.status === 'abandoned') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          mark="止"
          title="Lượt làm này đã bị bỏ"
          description="Bạn đã bắt đầu một lượt mới cho đề này."
          action={
            <Link to={exitPath(attempt)} className={buttonClasses()}>
              Quay lại
            </Link>
          }
        />
      </div>
    );
  }
  // query.refetch giữ nguyên tham chiếu giữa các lần render (TanStack Query), dùng được làm dependency.
  return <Runner key={attempt.id} attempt={attempt} receivedAt={query.dataUpdatedAt} refetch={query.refetch} />;
}

function Runner({ attempt, receivedAt, refetch }: { attempt: AttemptState; receivedAt: number; refetch: () => unknown }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidateExams = useInvalidateExamData();
  const runner = useExamRunner(attempt, refetch);
  const [navOpen, setNavOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState<'start' | 'submit' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const nextSection = attempt.timed ? attempt.sections.find((s) => !s.started_at && !s.submitted_at) : undefined;
  const section = runner.activeSection;

  // ---------- Đồng hồ ----------
  const remaining = useCountdown(section?.deadline_at ?? null, attempt.server_now, receivedAt, () => {
    setAnnouncement('Hết giờ. Phần này đã được nộp tự động.');
    toast.info('Hết giờ. Phần này đã được nộp tự động.');
    void runner.flushAll().finally(refetch);
  });
  const warned = useRef<string | null>(null);
  useEffect(() => {
    if (!section || remaining === null || remaining > WARNING_MS || remaining === 0) return;
    if (warned.current === section.id) return;
    warned.current = section.id;
    setAnnouncement('Còn 5 phút.');
    toast.info('Còn 5 phút cho phần này.');
  }, [remaining, section]);

  // Còn thay đổi chưa lưu thì hỏi trước khi rời trang (NFR-EX-02).
  const blocker = useLeaveGuard(runner.status !== 'saved');

  const finished = (status: 'submitted' | 'in_progress') => {
    void invalidateExams();
    if (status === 'submitted') navigate(`/de-thi/ket-qua/${attempt.id}`, { replace: true });
    else refetch();
  };

  const startSection = async (sectionId: string) => {
    setBusy('start');
    try {
      const state = await examsApi.startSection(attempt.id, sectionId);
      queryClient.setQueryData(queryKeys.attempts.state(attempt.id), state);
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Chưa bắt đầu được. Thử lại nhé.');
      refetch();
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    setSubmitError(null);
    setBusy('submit');
    try {
      if (!(await runner.flushAll())) {
        setSubmitError('Còn câu trả lời chưa lưu được lên máy chủ. Kiểm tra mạng rồi bấm nộp lại.');
        return;
      }
      if (attempt.timed && section) {
        const res = await examsApi.submitSection(attempt.id, section.id);
        setConfirmOpen(false);
        finished(res.attempt_status);
      } else {
        await examsApi.finish(attempt.id);
        setConfirmOpen(false);
        finished('submitted');
      }
    } catch (error) {
      if (isApiError(error) && (error.code === 'ATTEMPT_SUBMITTED' || error.code === 'SECTION_TIME_UP')) {
        setConfirmOpen(false);
        refetch();
      } else {
        setSubmitError(isApiError(error) ? error.message : 'Chưa nộp được. Thử lại nhé.');
      }
    } finally {
      setBusy(null);
    }
  };

  const exit = () => {
    void runner.flushAll();
    navigate(exitPath(attempt));
  };

  // ---------- Phím tắt (FR-RUN-13) ----------
  useHotkeys(
    {
      '1': () => runner.select(1),
      '2': () => runner.select(2),
      '3': () => runner.select(3),
      '4': () => runner.select(4),
      ArrowLeft: () => runner.goBy(-1),
      ArrowRight: () => runner.goBy(1),
      f: () => runner.toggleFlag(),
      F: () => runner.toggleFlag(),
    },
    Boolean(runner.current),
  );

  const liveRegion = (
    <div aria-live="assertive" role="alert" className="sr-only">
      {announcement}
    </div>
  );

  // Mọi phần đã nộp nhưng trạng thái chưa cập nhật (ví dụ hết giờ phần cuối): tải lại để sang kết quả.
  const allClosed = attempt.timed && !section && !nextSection;
  useEffect(() => {
    if (allClosed) refetch();
  }, [allClosed, refetch]);

  // Chế độ có bấm giờ, chưa có phần đang làm: màn hình chuyển phần.
  if (attempt.timed && !section) {
    if (!nextSection) return <FullPageLoader />;
    return (
      <div className="min-h-dvh bg-paper">
        <RunTopBar
          title={attempt.exam?.title ?? attempt.scope_label}
          subtitle={attempt.scope_label}
          remaining={null}
          status={runner.status}
          onExit={exit}
        />
        <SectionIntro
          attempt={attempt}
          section={nextSection}
          onStart={() => void startSection(nextSection.id)}
          starting={busy === 'start'}
        />
        {liveRegion}
      </div>
    );
  }

  const item = runner.current;
  const isLast = runner.currentIndex === runner.items.length - 1;
  const title = section?.title ?? attempt.scope_label;
  const subtitle = attempt.exam ? attempt.exam.title : attempt.scope_label;

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <RunTopBar
        title={title}
        subtitle={subtitle}
        remaining={remaining}
        status={runner.status}
        onOpenNav={() => setNavOpen(true)}
        onExit={exit}
        progress={`${runner.counts.answered}/${runner.counts.total}`}
      />

      <main className="min-h-0 flex-1">
        {item ? (
          <QuestionArea item={item} runner={runner} timed={attempt.timed} />
        ) : (
          <div className="mx-auto max-w-lg px-4 py-16">
            <EmptyState mark="空" title="Phần này chưa có câu hỏi" />
          </div>
        )}
      </main>

      <footer className="flex shrink-0 items-center gap-2 border-t border-rule bg-paper px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
        <Button variant="secondary" onClick={() => runner.goBy(-1)} disabled={runner.currentIndex === 0} aria-keyshortcuts="ArrowLeft">
          <ArrowLeft aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Câu trước</span>
          <span className="sr-only sm:hidden">Câu trước</span>
        </Button>
        <Button
          variant="ghost"
          onClick={runner.toggleFlag}
          aria-pressed={item ? Boolean(runner.answers[item.question.id]?.flagged) : false}
          aria-keyshortcuts="F"
          className={cn(item && runner.answers[item.question.id]?.flagged && 'text-son-ink')}
        >
          <Flag
            aria-hidden="true"
            className={cn('size-4', item && runner.answers[item.question.id]?.flagged && 'fill-son text-son')}
          />
          Xem lại
        </Button>
        <div className="flex-1" />
        <Button variant={isLast ? 'secondary' : 'primary'} onClick={() => runner.goBy(1)} disabled={isLast} aria-keyshortcuts="ArrowRight">
          <span className="hidden sm:inline">Câu sau</span>
          <span className="sr-only sm:hidden">Câu sau</span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
        <Button variant={isLast ? 'primary' : 'secondary'} onClick={() => setConfirmOpen(true)}>
          {attempt.timed ? 'Nộp phần' : 'Kết thúc'}
        </Button>
      </footer>

      <Modal
        open={navOpen}
        onClose={() => setNavOpen(false)}
        title={`Câu hỏi · ${title}`}
        description={`Đã làm ${runner.counts.answered}/${runner.counts.total} câu, đánh dấu ${runner.counts.flagged} câu.`}
        size="lg"
        placement="sheet"
      >
        <QuestionNavPanel
          items={runner.items}
          answers={runner.answers}
          feedback={runner.feedback}
          currentId={item?.question.id ?? null}
          onSelect={(id) => {
            runner.goTo(id);
            setNavOpen(false);
          }}
        />
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        dismissible={busy !== 'submit'}
        title={attempt.timed ? `Nộp phần ${title}?` : 'Kết thúc lượt luyện?'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={busy === 'submit'} data-autofocus>
              Làm tiếp
            </Button>
            <Button onClick={() => void submit()} loading={busy === 'submit'}>
              {attempt.timed ? 'Nộp phần' : 'Kết thúc'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2 text-[15px]">
          {/* FR-RUN-12: nêu số câu chưa làm và số câu đang đánh dấu. */}
          <p>
            Còn <strong className="tabular-nums">{runner.counts.unanswered}</strong> câu chưa làm và{' '}
            <strong className="tabular-nums">{runner.counts.flagged}</strong> câu đang đánh dấu xem lại.
          </p>
          {attempt.timed && remaining !== null && (
            <p className="text-ink-muted">Nộp rồi thì không sửa được phần này nữa, dù còn giờ.</p>
          )}
          {submitError && (
            <p role="alert" className="font-medium text-son-ink">
              {submitError}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Còn câu trả lời chưa lưu"
        description="Mất mạng nên một số câu chưa lên máy chủ. Chúng vẫn được giữ trên trình duyệt này và sẽ gửi khi bạn quay lại."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => blocker.proceed?.()}>
              Vẫn rời trang
            </Button>
            <Button data-autofocus onClick={() => blocker.reset?.()}>
              Ở lại
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">Trạng thái lưu hiện ở thanh trên cùng.</p>
      </Modal>
      {liveRegion}
    </div>
  );
}

type RunnerApi = ReturnType<typeof useExamRunner>;

/** Đầu mondai: 問題N và câu hướng dẫn tiếng Nhật, như đề in. */
function MondaiHeader({ item }: { item: RunnerItem }) {
  return (
    <div className="flex flex-col gap-1 border-b border-rule pb-3">
      <p lang="ja" className="font-jp text-sm font-semibold text-ink-muted">
        問題{item.mondai.number}
        {item.mondai.type_name_vi && <span className="ml-2 font-sans font-normal">· {item.mondai.type_name_vi}</span>}
      </p>
      {item.mondai.instructions.trim() && <Markup source={item.mondai.instructions} className="text-[15px]" />}
    </div>
  );
}

function QuestionPane({ item, runner, timed }: { item: RunnerItem; runner: RunnerApi; timed: boolean }) {
  const id = item.question.id;
  const feedback = runner.feedback[id];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [id]);

  return (
    <div ref={ref} tabIndex={-1} className="flex flex-col gap-5 outline-none">
      <MondaiHeader item={item} />
      <QuestionView
        question={item.question}
        selected={runner.answers[id]?.choice ?? null}
        onSelect={!timed && feedback ? undefined : runner.select}
        correct={feedback ? feedback.correct_option : undefined}
      />
      {feedback && (
        <section aria-label="Lời giải" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-rule bg-surface p-4">
          <p role="status" className={cn('font-semibold', feedback.is_correct ? 'text-moss-ink' : 'text-son-ink')}>
            {feedback.is_correct ? 'Đúng rồi!' : `Chưa đúng. Đáp án: ${feedback.correct_option ?? '–'}`}
          </p>
          {item.mondai.tip?.trim() && (
            <details className="rounded-[var(--radius-control)] border border-rule px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold">Mẹo làm 問題{item.mondai.number}</summary>
              <Markup source={item.mondai.tip} lang="vi" className="mt-2 text-[15px]" />
            </details>
          )}
          <ExplanationView
            kind={item.question.kind}
            options={item.question.options}
            correctOption={feedback.correct_option}
            starOrder={feedback.star_order}
            starPosition={item.question.star_position}
            explanation={feedback.explanation}
            learnerNote={feedback.learner_note}
          />
        </section>
      )}
    </div>
  );
}

/**
 * Vùng cuộn độc lập; đổi câu (resetKey) thì về đầu. Tab đang ẩn (display:none) mất vị trí cuộn,
 * nên vị trí được nhớ liên tục khi cuộn và trả lại khi tab hiện lại (FR-RUN-09).
 */
function ScrollPane({
  resetKey,
  active = true,
  children,
  label,
}: {
  resetKey: string;
  active?: boolean;
  children: ReactNode;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const saved = useRef(0);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
    saved.current = 0;
  }, [resetKey]);
  useLayoutEffect(() => {
    if (active && ref.current) ref.current.scrollTop = saved.current;
  }, [active]);
  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      onScroll={(e) => {
        if (active) saved.current = e.currentTarget.scrollTop;
      }}
      className="h-full overflow-y-auto overscroll-contain"
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">{children}</div>
    </div>
  );
}

/**
 * Câu có bài đọc (FR-RUN-09): máy tính chia hai cột cuộn độc lập (bài đọc trái, câu hỏi phải);
 * điện thoại chuyển bằng tab Bài đọc / Câu hỏi, mỗi tab giữ vị trí cuộn riêng.
 */
function QuestionArea({ item, runner, timed }: { item: RunnerItem; runner: RunnerApi; timed: boolean }) {
  const split = useMediaQuery(SPLIT_QUERY);
  const [tab, setTab] = useState<'passage' | 'question'>('question');
  const passage = item.passage;

  const question = <QuestionPane item={item} runner={runner} timed={timed} />;
  if (!passage) {
    return (
      <ScrollPane resetKey={item.question.id} label="Câu hỏi">
        {question}
      </ScrollPane>
    );
  }

  // Bản furigana và bản dịch thuộc lời giải: chế độ luyện chỉ mở khi đã trả lời hết câu của bài.
  const passageQuestions = runner.items.filter((i) => i.passage?.id === passage.id);
  const solved = !timed && passageQuestions.every((i) => runner.feedback[i.question.id]);
  const passageView = (
    <PassageView passage={passage} activeBlank={item.question.number} showSolutionToggles={solved} />
  );

  if (split) {
    return (
      <div className="grid h-full grid-cols-2 divide-x divide-rule">
        <ScrollPane resetKey={passage.id} label="Bài đọc">
          {passageView}
        </ScrollPane>
        <ScrollPane resetKey={item.question.id} label="Câu hỏi">
          {question}
        </ScrollPane>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div role="tablist" aria-label="Bài đọc và câu hỏi" className="grid shrink-0 grid-cols-2 border-b border-rule">
        {(['passage', 'question'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            onClick={() => setTab(key)}
            className={cn(
              'relative h-11 text-sm font-semibold',
              tab === key ? 'text-ink' : 'text-ink-muted',
            )}
          >
            {key === 'passage' ? 'Bài đọc' : `Câu hỏi ${item.question.number}`}
            <span aria-hidden="true" className={cn('absolute inset-x-6 bottom-0 h-0.5', tab === key ? 'bg-son' : 'bg-transparent')} />
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <div id="panel-passage" role="tabpanel" aria-labelledby="tab-passage" className={cn('h-full', tab !== 'passage' && 'hidden')}>
          <ScrollPane resetKey={passage.id} active={tab === 'passage'} label="Bài đọc">
            {passageView}
          </ScrollPane>
        </div>
        <div id="panel-question" role="tabpanel" aria-labelledby="tab-question" className={cn('h-full', tab !== 'question' && 'hidden')}>
          <ScrollPane resetKey={item.question.id} active={tab === 'question'} label="Câu hỏi">
            {question}
          </ScrollPane>
        </div>
      </div>
    </div>
  );
}
