import { CheckCheck, Download, Eye, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { examAdminApi } from '@/api/examAdminApi';
import { isApiError } from '@/api/client';
import { ExamOutline, selectionKey, type Selection } from '@/components/examAdmin/ExamOutline';
import { ExamInfoForm, MondaiForm, PassageForm, SectionForm } from '@/components/examAdmin/EntityForms';
import { IssuesPanel } from '@/components/examAdmin/IssuesPanel';
import { QuestionForm } from '@/components/examAdmin/QuestionForm';
import { StatusBadge } from '@/components/examAdmin/StatusBadge';
import { selectionOf, validateLocally } from '@/components/examAdmin/validation';
import { SaveIndicator } from '@/components/exam/run/RunTopBar';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useAdminExam, useDuplicateExam, useMondaiTypes, useSetExamStatus, useSetExamTree } from '@/hooks/queries/useExamAdmin';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { useEditorSaveSummary } from '@/stores/editorStatusStore';
import { toast } from '@/stores/toastStore';
import type { AdminExam, ExamIssue, ExamOrder, ExamStatus, ValidationResult } from '@/types/exam';
import { saveBlob } from '@/utils/download';
import { STATUS_LABELS } from '@/utils/examFormat';

const parseSelection = (value: string | null): Selection => {
  const [kind, id] = (value ?? '').split(':');
  if ((kind === 'section' || kind === 'mondai' || kind === 'passage' || kind === 'question') && id) return { kind, id };
  return { kind: 'exam' };
};

/** Nút chuyển trạng thái theo trạng thái hiện tại (FR-CMS-13). */
const TRANSITIONS: Record<ExamStatus, { to: ExamStatus; label: string; primary?: boolean }[]> = {
  draft: [{ to: 'pending_review', label: 'Gửi duyệt', primary: true }],
  pending_review: [
    { to: 'draft', label: 'Trả về nháp' },
    { to: 'published', label: 'Xuất bản', primary: true },
  ],
  published: [{ to: 'hidden', label: 'Ẩn đề' }],
  hidden: [
    { to: 'draft', label: 'Về nháp' },
    { to: 'published', label: 'Xuất bản lại', primary: true },
  ],
};

/** Tìm mục đang chọn trong cây (null nếu đã bị xóa). */
function findSelected(exam: AdminExam, selection: Selection) {
  for (const section of exam.sections) {
    if (selection.kind === 'section' && section.id === selection.id) return { section };
    for (const mondai of section.mondai) {
      if (selection.kind === 'mondai' && mondai.id === selection.id) return { section, mondai };
      const pIndex = mondai.passages.findIndex((p) => p.id === ('id' in selection ? selection.id : ''));
      if (selection.kind === 'passage' && pIndex >= 0) return { section, mondai, passage: mondai.passages[pIndex]!, pIndex };
      const question = mondai.questions.find((q) => q.id === ('id' in selection ? selection.id : ''));
      if (selection.kind === 'question' && question) return { section, mondai, question };
    }
  }
  return null;
}

/** /quan-tri/de-thi/:examId: trình soạn đề (FR-CMS-02 đến 18). */
export default function AdminExamEditorPage() {
  const { examId = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const examQuery = useAdminExam(examId);
  const types = useMondaiTypes();
  const setTree = useSetExamTree();
  const setStatus = useSetExamStatus();
  const duplicate = useDuplicateExam();
  const saveSummary = useEditorSaveSummary();
  const [busy, setBusy] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [serverIssues, setServerIssues] = useState<ValidationResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useDocumentTitle(examQuery.data ? `Soạn: ${examQuery.data.title}` : 'Soạn đề');

  const selection = parseSelection(params.get('muc'));
  const select = (next: Selection) =>
    setParams(next.kind === 'exam' ? {} : { muc: selectionKey(next) }, { replace: true });

  // Thay đổi chưa lưu thì hỏi trước khi rời trang (FR-CMS-12).
  const blocker = useLeaveGuard(saveSummary !== 'saved');

  const exam = examQuery.data;
  const typeList = useMemo(() => types.data ?? [], [types.data]);
  const live = useMemo(() => (exam ? validateLocally(exam, typeList) : { errors: [], warnings: [] }), [exam, typeList]);
  const errorCount = useMemo(() => {
    const counts = new Map<string, number>();
    if (!exam) return counts;
    for (const issue of live.errors) {
      const target = selectionOf(exam, issue);
      if (target?.kind === 'question') counts.set(target.id, (counts.get(target.id) ?? 0) + 1);
    }
    return counts;
  }, [exam, live]);

  if (examQuery.isPending) {
    return (
      <SkeletonGroup label="Đang tải đề" className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </SkeletonGroup>
    );
  }
  if (examQuery.isError || !exam) {
    const notFound = isApiError(examQuery.error) && examQuery.error.status === 404;
    return notFound ? (
      <EmptyState
        mark="無"
        title="Không tìm thấy đề"
        action={
          <Link to="/quan-tri/de-thi" className={buttonClasses()}>
            Về danh sách đề
          </Link>
        }
      />
    ) : (
      <ErrorState title="Chưa tải được đề" onRetry={() => void examQuery.refetch()} retrying={examQuery.isRefetching} />
    );
  }

  /** Thêm/xóa/sắp xếp: gọi API, ghi cây đề mới vào cache. */
  const structural = async (action: () => Promise<AdminExam>, after?: (tree: AdminExam) => void) => {
    setBusy(true);
    try {
      const tree = await action();
      setTree(tree);
      after?.(tree);
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Chưa lưu được thay đổi. Thử lại nhé.');
    } finally {
      setBusy(false);
    }
  };

  const add = (what: 'section' | { mondaiIn: string } | { questionIn: string } | { passageIn: string }) => {
    if (what === 'section') {
      void structural(
        () => examAdminApi.createSection(exam.id, { title: 'Phần thi mới', duration_minutes: null }),
        (tree) => select({ kind: 'section', id: tree.sections.at(-1)!.id }),
      );
    } else if ('mondaiIn' in what) {
      void structural(
        () => examAdminApi.createMondai(what.mondaiIn, {}),
        (tree) => select({ kind: 'mondai', id: tree.sections.find((s) => s.id === what.mondaiIn)!.mondai.at(-1)!.id }),
      );
    } else if ('questionIn' in what) {
      void structural(
        () => examAdminApi.createQuestion(what.questionIn, {}),
        (tree) => {
          const mondai = tree.sections.flatMap((s) => s.mondai).find((m) => m.id === what.questionIn)!;
          select({ kind: 'question', id: mondai.questions.at(-1)!.id });
        },
      );
    } else {
      void structural(
        () => examAdminApi.createPassage(what.passageIn, {}),
        (tree) => {
          const mondai = tree.sections.flatMap((s) => s.mondai).find((m) => m.id === what.passageIn)!;
          select({ kind: 'passage', id: mondai.passages.at(-1)!.id });
        },
      );
    }
  };

  const reorder = (order: ExamOrder) => void structural(() => examAdminApi.reorder(exam.id, order));

  const remove = () => {
    setConfirmDelete(false);
    const done = () => select({ kind: 'exam' });
    if (selection.kind === 'section') void structural(() => examAdminApi.deleteSection(selection.id), done);
    if (selection.kind === 'mondai') void structural(() => examAdminApi.deleteMondai(selection.id), done);
    if (selection.kind === 'passage') void structural(() => examAdminApi.deletePassage(selection.id), done);
    if (selection.kind === 'question') void structural(() => examAdminApi.deleteQuestion(selection.id), done);
  };

  const changeStatus = (to: ExamStatus) =>
    setStatus.mutate(
      { examId: exam.id, status: to },
      {
        onSuccess: (updated) => toast.success(`Đề đã chuyển sang “${STATUS_LABELS[updated.status]}”`),
        onError: (error) => {
          if (isApiError(error) && error.code === 'EXAM_INVALID') {
            setServerIssues(error.details as unknown as ValidationResult);
            setIssuesOpen(true);
          }
          toast.error(isApiError(error) ? error.message : 'Chưa đổi được trạng thái');
        },
      },
    );

  const exportFile = async () => {
    try {
      const { blob, filename } = await examAdminApi.exportFile(exam.id);
      saveBlob(blob, filename);
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Chưa xuất được file');
    }
  };

  const checkOnServer = async () => {
    try {
      setServerIssues(await examAdminApi.validate(exam.id));
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Chưa kiểm tra được');
    }
  };

  const pick = (issue: ExamIssue) => {
    const target = selectionOf(exam, issue);
    if (target) select(target);
    setIssuesOpen(false);
  };

  const found = findSelected(exam, selection);
  const typeOf = (id: string | null) => typeList.find((t) => t.id === id);
  let form;
  if (selection.kind === 'exam' || !found) {
    form = <ExamInfoForm key={`exam-${exam.id}`} exam={exam} />;
  } else if (selection.kind === 'section') {
    form = <SectionForm key={found.section.id} examId={exam.id} level={exam.level} section={found.section} />;
  } else if (selection.kind === 'mondai' && found.mondai) {
    form = <MondaiForm key={found.mondai.id} examId={exam.id} mondai={found.mondai} types={typeList} level={exam.level} />;
  } else if (selection.kind === 'passage' && 'passage' in found && found.passage) {
    form = <PassageForm key={found.passage.id} examId={exam.id} passage={found.passage} index={found.pIndex ?? 0} />;
  } else if ('question' in found && found.question && found.mondai) {
    form = (
      <QuestionForm
        key={found.question.id}
        examId={exam.id}
        question={found.question}
        mondai={found.mondai}
        type={typeOf(found.mondai.type_id)}
      />
    );
  }

  const issues = serverIssues ?? live;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/quan-tri/de-thi" className="text-sm text-ink-muted hover:text-ink">
            ← Đề thi
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 text-[26px]">
            {exam.title}
            <StatusBadge status={exam.status} />
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
            <span>
              {exam.level} · {exam.sections.reduce((n, s) => n + s.mondai.reduce((k, m) => k + m.questions.length, 0), 0)} câu ·{' '}
              {exam.attempt_count} lượt đã nộp
            </span>
            <SaveIndicator status={saveSummary} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setIssuesOpen(true)}>
            <CheckCheck aria-hidden="true" className="size-4" />
            Kiểm tra
            {live.errors.length > 0 && <span className="bg-son px-1 text-xs text-on-son">{live.errors.length}</span>}
          </Button>
          <Link to={`/quan-tri/de-thi/${exam.id}/xem-truoc`} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            <Eye aria-hidden="true" className="size-4" />
            Xem trước
          </Link>
          <Button variant="secondary" size="sm" onClick={() => void exportFile()}>
            <Download aria-hidden="true" className="size-4" />
            Xuất file
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={duplicate.isPending}
            onClick={() =>
              duplicate.mutate(exam.id, {
                onSuccess: (copy) => {
                  toast.success('Đã nhân bản thành đề nháp mới');
                  navigate(`/quan-tri/de-thi/${copy.id}`);
                },
              })
            }
          >
            Nhân bản
          </Button>
          {TRANSITIONS[exam.status].map((t) => (
            <Button
              key={t.to}
              size="sm"
              variant={t.primary ? 'primary' : 'secondary'}
              loading={setStatus.isPending && setStatus.variables?.status === t.to}
              disabled={saveSummary !== 'saved'}
              onClick={() => changeStatus(t.to)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {exam.status === 'published' && (
        <p role="note" className="border-l-[3px] border-son bg-son-wash/50 px-3 py-2 text-[15px]">
          Đề đang xuất bản: mọi thay đổi có hiệu lực ngay với người học. Đổi đáp án đúng sẽ chấm lại các lượt đã nộp.
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="max-h-[calc(100dvh-6rem)] overflow-y-auto p-2 lg:sticky lg:top-4">
          <ExamOutline
            exam={exam}
            types={typeList}
            selected={selection}
            onSelect={select}
            onReorder={reorder}
            onAdd={add}
            errorCount={errorCount}
            busy={busy}
          />
        </Card>
        <Card className="flex flex-col gap-4 p-4 sm:p-5">
          {form}
          {selection.kind !== 'exam' && found && (
            <div className="border-t border-rule pt-4">
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} disabled={busy}>
                <Trash2 aria-hidden="true" className="size-4" />
                Xóa{' '}
                {selection.kind === 'section' ? 'phần thi' : selection.kind === 'mondai' ? 'mondai' : selection.kind === 'passage' ? 'bài đọc' : 'câu hỏi'}
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={issuesOpen}
        onClose={() => setIssuesOpen(false)}
        title="Kiểm tra đề"
        description={serverIssues ? 'Kết quả kiểm tra trên máy chủ (đủ mọi luật, kể cả ảnh).' : 'Kiểm tra ngay trên trình duyệt theo luật DR-EX-10.'}
        size="lg"
        footer={
          <>
            {serverIssues && (
              <Button variant="ghost" onClick={() => setServerIssues(null)}>
                Xem kết quả trên trình duyệt
              </Button>
            )}
            <Button variant="secondary" onClick={() => void checkOnServer()}>
              Kiểm tra trên máy chủ
            </Button>
          </>
        }
      >
        <IssuesPanel errors={issues.errors} warnings={issues.warnings} onPick={pick} />
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Xóa mục này?"
        description="Xóa phần thi hoặc mondai thì xóa luôn mọi câu bên trong. Lượt đã nộp được đếm lại điểm."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} data-autofocus>
              Không xóa
            </Button>
            <Button variant="danger" onClick={remove}>
              Xóa
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">Thao tác này không hoàn tác được.</p>
      </Modal>

      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Còn thay đổi chưa lưu"
        description="Một số thay đổi chưa lên máy chủ. Rời trang bây giờ có thể mất các thay đổi đó."
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
        <p className="text-sm text-ink-muted">Đợi “Đã lưu” ở đầu trang rồi hãy rời đi.</p>
      </Modal>
    </div>
  );
}
