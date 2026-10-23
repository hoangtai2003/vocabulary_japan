import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isApiError } from '@/api/client';
import { Markup } from '@/components/exam/Markup';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useExamAttempts, useExamDetail, useStartAttempt } from '@/hooks/queries/useExams';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { ExamDetail, StartAttemptRequest } from '@/types/exam';
import { formatDateTime, MODE_LABELS } from '@/utils/examFormat';

function ModeCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div>
        <h3 className="text-lg">{title}</h3>
        <p className="text-sm text-ink-muted">{description}</p>
      </div>
      {children}
    </Card>
  );
}

/** Ba chế độ luyện (FR-EXAM-04 đến 06). */
function Modes({ exam, onStart, starting }: { exam: ExamDetail; onStart: (body: StartAttemptRequest) => void; starting: boolean }) {
  const [sectionId, setSectionId] = useState(exam.sections[0]?.id ?? '');
  const [practiceScope, setPracticeScope] = useState(`section:${exam.sections[0]?.id ?? ''}`);
  const section = exam.sections.find((s) => s.id === sectionId);
  const scopeOptions = exam.sections.flatMap((s) => [
    { value: `section:${s.id}`, label: `${s.title} (cả phần, ${s.question_count} câu)` },
    ...s.mondai.map((m) => ({
      value: `mondai:${m.id}`,
      label: `　問題${m.number}${m.type_name_vi ? ` · ${m.type_name_vi}` : ''} (${m.question_count} câu)`,
    })),
  ]);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <ModeCard
        title="Thi thử trọn đề"
        description={`Làm lần lượt ${exam.sections.length} phần, ${exam.total_minutes} phút, xem đáp án sau khi nộp hết.`}
      >
        <Button className="mt-auto" loading={starting} onClick={() => onStart({ mode: 'exam', scope: { type: 'exam' } })}>
          Bắt đầu thi thử
        </Button>
      </ModeCard>
      <ModeCard title="Luyện một phần" description="Bấm giờ theo thời gian chuẩn của phần đó.">
        <Select
          label="Phần thi"
          hideLabel
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          options={exam.sections.map((s) => ({ value: s.id, label: `${s.title} · ${s.duration_minutes ?? '?'} phút` }))}
        />
        <Button
          variant="secondary"
          className="mt-auto"
          disabled={!section}
          loading={starting}
          onClick={() => onStart({ mode: 'section', scope: { type: 'section', id: sectionId } })}
        >
          Luyện phần này
        </Button>
      </ModeCard>
      <ModeCard title="Không giới hạn giờ" description="Xem đúng sai và lời giải ngay sau mỗi câu.">
        <Select
          label="Phạm vi"
          hideLabel
          value={practiceScope}
          onChange={(e) => setPracticeScope(e.target.value)}
          options={scopeOptions}
        />
        <Button
          variant="secondary"
          className="mt-auto"
          loading={starting}
          onClick={() => {
            const [type, id] = practiceScope.split(':') as ['section' | 'mondai', string];
            onStart({ mode: 'practice', scope: { type, id } });
          }}
        >
          Luyện không giới hạn giờ
        </Button>
      </ModeCard>
    </div>
  );
}

function History({ examId }: { examId: string }) {
  const attempts = useExamAttempts(examId);
  if (attempts.isPending) return <Skeleton className="h-20 w-full" />;
  if (attempts.isError) return <ErrorState title="Chưa tải được lịch sử" onRetry={() => void attempts.refetch()} />;
  if (attempts.data.length === 0) return <p className="text-ink-muted">Bạn chưa làm đề này lần nào.</p>;
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {attempts.data.map((a) => {
        const done = a.status === 'submitted';
        return (
          <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {MODE_LABELS[a.mode]} <span className="font-normal text-ink-muted">· {a.scope_label}</span>
              </p>
              <p className="text-sm text-ink-muted">
                {formatDateTime(a.submitted_at ?? a.started_at)}
                {a.regraded && ' · đề đã được cập nhật sau lần làm này'}
              </p>
            </div>
            {done ? (
              <p className="tabular-nums">
                {a.estimated_score !== null && <strong className="mr-2">{a.estimated_score}/120</strong>}
                <span className="text-ink-muted">
                  {a.correct}/{a.total} câu
                </span>
              </p>
            ) : (
              <span className="bg-son-wash px-1.5 text-xs font-semibold text-son-ink">Đang làm dở</span>
            )}
            <Link
              to={done ? `/de-thi/ket-qua/${a.id}` : `/de-thi/lam/${a.id}`}
              className={buttonClasses({ variant: 'secondary', size: 'sm' })}
            >
              {done ? 'Xem kết quả' : 'Làm tiếp'}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** /de-thi/:examId (FR-EXAM-03): các phần thi, số câu và thời gian, chọn chế độ, lịch sử lượt làm. */
export default function ExamDetailPage() {
  const { examId = '' } = useParams();
  const navigate = useNavigate();
  const detail = useExamDetail(examId);
  const start = useStartAttempt(examId);
  const [pending, setPending] = useState<{ body: StartAttemptRequest; attemptId: string } | null>(null);
  useDocumentTitle(detail.data?.title ?? 'Đề thi');

  const begin = (body: StartAttemptRequest) => {
    start.mutate(body, {
      onSuccess: ({ attempt_id }) => navigate(`/de-thi/lam/${attempt_id}`),
      onError: (error) => {
        // FR-RUN-05: mỗi đề một lượt dở; hỏi trước khi bỏ lượt cũ.
        if (isApiError(error) && error.code === 'ATTEMPT_IN_PROGRESS') {
          setPending({ body, attemptId: String(error.details?.attempt_id ?? '') });
        }
      },
    });
  };

  if (detail.isPending) {
    return (
      <SkeletonGroup label="Đang tải đề" className="flex flex-col gap-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </SkeletonGroup>
    );
  }
  if (detail.isError) {
    const notFound = isApiError(detail.error) && detail.error.status === 404;
    return notFound ? (
      <EmptyState
        mark="無"
        title="Không tìm thấy đề"
        description="Đề này không tồn tại hoặc đã bị ẩn."
        action={
          <Link to="/de-thi" className={buttonClasses()}>
            Về danh sách đề
          </Link>
        }
      />
    ) : (
      <ErrorState title="Chưa tải được đề" onRetry={() => void detail.refetch()} retrying={detail.isRefetching} />
    );
  }

  const exam = detail.data;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={exam.title}
        description={`${exam.level}${exam.difficulty ? ` · ${exam.difficulty}` : ''} · ${exam.question_count} câu · ${exam.total_minutes} phút`}
        actions={
          <Link to="/de-thi" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
            Tất cả đề
          </Link>
        }
      />
      {exam.description && <Markup source={exam.description} lang="vi" className="-mt-2 text-ink-muted" />}

      {exam.in_progress && (
        <div className="flex flex-wrap items-center gap-3 border border-son/40 border-l-[3px] border-l-son bg-son-wash/50 px-4 py-3">
          <p className="min-w-0 flex-1">
            Bạn đang làm dở một lượt <strong>{MODE_LABELS[exam.in_progress.mode].toLowerCase()}</strong>, bắt đầu{' '}
            {formatDateTime(exam.in_progress.started_at)}.
          </p>
          <Link to={`/de-thi/lam/${exam.in_progress.attempt_id}`} className={buttonClasses({ size: 'sm' })}>
            Làm tiếp
          </Link>
        </div>
      )}

      <section aria-labelledby="structure" className="flex flex-col gap-3">
        <h2 id="structure" className="text-[22px]">
          Cấu trúc đề
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {exam.sections.map((s, index) => (
            <Card key={s.id} className="p-4">
              <p className="text-sm text-ink-muted">Phần {index + 1}</p>
              <h3 lang="ja" className="font-jp text-lg font-semibold">
                {s.title}
              </h3>
              <p className="mb-2 text-sm text-ink-muted">
                {s.question_count} câu · {s.duration_minutes ?? '?'} phút
              </p>
              <ul className="text-sm">
                {s.mondai.map((m) => (
                  <li key={m.id} className="flex justify-between gap-3 border-t border-rule py-1">
                    <span>
                      <span lang="ja">問題{m.number}</span>
                      {m.type_name_vi && <span className="text-ink-muted"> · {m.type_name_vi}</span>}
                    </span>
                    <span className="tabular-nums text-ink-muted">{m.question_count} câu</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        {exam.instructions && <Markup source={exam.instructions} lang="vi" className="text-[15px] text-ink-muted" />}
      </section>

      <section aria-labelledby="modes" className="flex flex-col gap-3">
        <h2 id="modes" className="text-[22px]">
          Chọn chế độ
        </h2>
        {start.isError && !(isApiError(start.error) && start.error.code === 'ATTEMPT_IN_PROGRESS') && (
          <ErrorState
            title="Chưa bắt đầu được"
            message={isApiError(start.error) ? start.error.message : 'Kiểm tra kết nối mạng rồi thử lại.'}
          />
        )}
        <Modes exam={exam} onStart={begin} starting={start.isPending} />
      </section>

      <section aria-labelledby="history" className="flex flex-col gap-3">
        <h2 id="history" className="text-[22px]">
          Các lượt đã làm
        </h2>
        <History examId={exam.id} />
      </section>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Bỏ lượt đang làm dở?"
        description="Mỗi đề chỉ có một lượt đang làm. Bắt đầu lượt mới thì lượt cũ bị bỏ, không xem lại được."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => pending && navigate(`/de-thi/lam/${pending.attemptId}`)} data-autofocus>
              Làm tiếp lượt cũ
            </Button>
            <Button
              variant="danger"
              loading={start.isPending}
              onClick={() => pending && begin({ ...pending.body, discard_in_progress: true })}
            >
              Bỏ lượt cũ, làm mới
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">Câu trả lời của lượt cũ đã được lưu nếu bạn chọn làm tiếp.</p>
      </Modal>
    </div>
  );
}
