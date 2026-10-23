import { zodResolver } from '@hookform/resolvers/zod';
import { Flag, Plus, Upload } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { isApiError } from '@/api/client';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { StatusBadge } from '@/components/examAdmin/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import {
  useAdminExams,
  useCreateExam,
  useDeleteExam,
  useDuplicateExam,
  useMondaiTypes,
  useSaveMondaiType,
  useSetExamStatus,
} from '@/hooks/queries/useExamAdmin';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { toast } from '@/stores/toastStore';
import type { AdminExamListItem, ExamStatus, MondaiType } from '@/types/exam';
import { JLPT_LEVELS, type JlptLevel } from '@/types/word';
import { EXAM_STATUSES } from '@/utils/exam';
import { formatDateTime, STATUS_LABELS } from '@/utils/examFormat';
import { applyApiErrors } from '@/utils/formErrors';

const createSchema = z.object({
  title: z.string().trim().min(1, 'Nhập tên đề').max(120, 'Tối đa 120 ký tự'),
  level: z.enum(['N5', 'N4', 'N3']),
  difficulty: z.string().trim().max(40, 'Tối đa 40 ký tự'),
  source: z.string().trim().min(1, 'Nhập nguồn của đề').max(200, 'Tối đa 200 ký tự'),
});
type CreateValues = z.infer<typeof createSchema>;

/** Tạo đề mới (FR-CMS-02): server tạo sẵn hai phần thi theo thời gian chuẩn của cấp. */
function CreateExamModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const create = useCreateExam();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: '', level: 'N4', difficulty: '', source: 'Tự soạn' },
  });
  const submit = form.handleSubmit((values) =>
    create.mutate(
      { ...values, difficulty: values.difficulty || null, description: '', instructions: '' },
      {
        onSuccess: (exam) => navigate(`/quan-tri/de-thi/${exam.id}`),
        onError: (error) => setFormError(applyApiErrors(error, form.setError, ['title', 'level', 'difficulty', 'source'])),
      },
    ),
  );
  const errors = form.formState.errors;
  return (
    <Modal
      open
      onClose={onClose}
      title="Tạo đề mới"
      description="Đề mới ở trạng thái Nháp, có sẵn hai phần thi theo thời gian chuẩn."
      dismissible={!create.isPending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Hủy
          </Button>
          <Button type="submit" form="create-exam" loading={create.isPending}>
            Tạo đề
          </Button>
        </>
      }
    >
      <form id="create-exam" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {formError && (
          <p role="alert" className="text-sm font-medium text-son-ink">
            {formError}
          </p>
        )}
        <Input label="Tên đề" {...form.register('title')} error={errors.title?.message} placeholder="N4 · Đề luyện số 12" data-autofocus />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Cấp độ" {...form.register('level')} options={JLPT_LEVELS.map((l) => ({ value: l, label: l }))} />
          <Input label="Độ khó" {...form.register('difficulty')} error={errors.difficulty?.message} placeholder="Nâng cao" />
        </div>
        <Input
          label="Nguồn của đề"
          {...form.register('source')}
          error={errors.source?.message}
          hint="Chỉ đưa lên app đề bạn có quyền sử dụng."
        />
      </form>
    </Modal>
  );
}

const emptyType = (level: JlptLevel): MondaiType => ({
  id: '',
  level,
  section_title: '文字・語彙',
  label_ja: '',
  name_vi: '',
  answer_kind: 'choice',
  has_passage: false,
  default_instructions: '',
  sort_order: 0,
});

/** Danh sách dạng mondai (mục 2.2): dữ liệu tham chiếu, sửa được, thêm dạng mới (ví dụ N5). */
function MondaiTypesModal({ onClose }: { onClose: () => void }) {
  const types = useMondaiTypes();
  const save = useSaveMondaiType();
  const [editing, setEditing] = useState<{ type: MondaiType; isNew: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<MondaiType>) => setEditing((e) => (e ? { ...e, type: { ...e.type, ...patch } } : e));

  return (
    <Modal open onClose={onClose} title="Dạng mondai" description="Dùng khi soạn mondai và khi thống kê theo dạng." size="lg">
      {editing ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            save.mutate(editing, {
              onSuccess: () => {
                toast.success('Đã lưu dạng mondai');
                setEditing(null);
              },
              onError: (err) => setError(isApiError(err) ? (Object.values(err.fields ?? {})[0] ?? err.message) : 'Chưa lưu được'),
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Mã"
              value={editing.type.id}
              onChange={(e) => set({ id: e.target.value })}
              disabled={!editing.isNew}
              placeholder="n5_kanji_yomi"
            />
            <Select
              label="Cấp độ"
              value={editing.type.level}
              onChange={(e) => set({ level: e.target.value as JlptLevel })}
              options={JLPT_LEVELS.map((l) => ({ value: l, label: l }))}
            />
            <Input label="Thứ tự" type="number" value={editing.type.sort_order} onChange={(e) => set({ sort_order: Number(e.target.value) || 0 })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Phần thi" lang="ja" value={editing.type.section_title} onChange={(e) => set({ section_title: e.target.value })} />
            <Input label="Tên tiếng Nhật" lang="ja" value={editing.type.label_ja} onChange={(e) => set({ label_ja: e.target.value })} />
            <Input label="Tên tiếng Việt" value={editing.type.name_vi} onChange={(e) => set({ name_vi: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Kiểu trả lời"
              value={editing.type.answer_kind}
              onChange={(e) => set({ answer_kind: e.target.value as MondaiType['answer_kind'] })}
              options={[
                { value: 'choice', label: 'Chọn 1 trong 4' },
                { value: 'star', label: 'Câu ★' },
              ]}
            />
            <label className="flex items-center gap-2 pt-7 text-sm">
              <input type="checkbox" checked={editing.type.has_passage} onChange={(e) => set({ has_passage: e.target.checked })} className="size-4" />
              Có bài đọc
            </label>
          </div>
          <Textarea
            label="Câu hướng dẫn mặc định"
            lang="ja"
            value={editing.type.default_instructions}
            onChange={(e) => set({ default_instructions: e.target.value })}
            rows={2}
          />
          {error && (
            <p role="alert" className="text-sm font-medium text-son-ink">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button type="submit" loading={save.isPending}>
              Lưu
            </Button>
          </div>
        </form>
      ) : types.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : types.isError ? (
        <ErrorState title="Chưa tải được danh sách dạng" onRetry={() => void types.refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-ink-muted">
                  <th scope="col" className="py-2 font-medium">Cấp</th>
                  <th scope="col" className="py-2 font-medium">Dạng</th>
                  <th scope="col" className="py-2 font-medium">Kiểu</th>
                  <th scope="col" className="py-2" />
                </tr>
              </thead>
              <tbody>
                {types.data.map((t) => (
                  <tr key={t.id} className="border-b border-rule">
                    <td className="py-2">{t.level}</td>
                    <td className="py-2">
                      <span lang="ja">{t.label_ja}</span> · {t.name_vi}
                      <span className="block text-xs text-ink-muted">{t.id}</span>
                    </td>
                    <td className="py-2 text-ink-muted">
                      {t.answer_kind === 'star' ? 'Câu ★' : 'Chọn 1 trong 4'}
                      {t.has_passage && ', có bài đọc'}
                    </td>
                    <td className="py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditing({ type: t, isNew: false })}>
                        Sửa
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="secondary" size="sm" className="self-start" onClick={() => setEditing({ type: emptyType('N5'), isNew: true })}>
            <Plus aria-hidden="true" className="size-4" />
            Thêm dạng
          </Button>
        </div>
      )}
    </Modal>
  );
}

function ExamRow({ exam, onDelete }: { exam: AdminExamListItem; onDelete: (exam: AdminExamListItem) => void }) {
  const navigate = useNavigate();
  const duplicate = useDuplicateExam();
  const setStatus = useSetExamStatus();
  return (
    <tr className="border-b border-rule align-top">
      <td className="py-3 pr-3">
        <Link to={`/quan-tri/de-thi/${exam.id}`} className="font-semibold hover:underline">
          {exam.title}
        </Link>
        <p className="text-xs text-ink-muted">
          {exam.difficulty ?? 'Chưa ghi độ khó'} · sửa {formatDateTime(exam.updated_at)}
        </p>
      </td>
      <td className="py-3 pr-3">{exam.level}</td>
      <td className="py-3 pr-3">
        <StatusBadge status={exam.status} />
      </td>
      <td className="py-3 pr-3 text-right tabular-nums">{exam.question_count}</td>
      <td className="py-3 pr-3 text-right tabular-nums">
        {exam.flagged_count > 0 ? (
          <span className="inline-flex items-center gap-1 text-son-ink">
            <Flag aria-hidden="true" className="size-3.5 fill-son" />
            {exam.flagged_count}
          </span>
        ) : (
          0
        )}
      </td>
      <td className="py-3 pr-3 text-right tabular-nums">{exam.attempt_count}</td>
      <td className="py-3 text-right">
        <div className="flex flex-wrap justify-end gap-1">
          <Link to={`/quan-tri/de-thi/${exam.id}/xem-truoc`} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
            Xem trước
          </Link>
          <Button
            variant="ghost"
            size="sm"
            loading={duplicate.isPending}
            onClick={() => duplicate.mutate(exam.id, { onSuccess: (copy) => navigate(`/quan-tri/de-thi/${copy.id}`) })}
          >
            Nhân bản
          </Button>
          {exam.attempt_count > 0 ? (
            exam.status === 'published' && (
              <Button
                variant="ghost"
                size="sm"
                loading={setStatus.isPending}
                onClick={() => setStatus.mutate({ examId: exam.id, status: 'hidden' }, { onSuccess: () => toast.success('Đã ẩn đề') })}
              >
                Ẩn
              </Button>
            )
          ) : (
            <Button variant="ghost" size="sm" className="text-son-ink" onClick={() => onDelete(exam)}>
              Xóa
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

/** /quan-tri/de-thi (FR-CMS-01): mọi đề, lọc theo cấp và trạng thái. */
export default function AdminExamsPage() {
  useDocumentTitle('Quản trị đề thi');
  const [level, setLevel] = useState<JlptLevel | ''>('');
  const [status, setStatus] = useState<ExamStatus | ''>('');
  const [dialog, setDialog] = useState<'create' | 'types' | { remove: AdminExamListItem } | null>(null);
  const exams = useAdminExams({ level: level || undefined, status: status || undefined });
  const remove = useDeleteExam();

  let content;
  if (exams.isPending) {
    content = (
      <SkeletonGroup label="Đang tải danh sách đề" className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </SkeletonGroup>
    );
  } else if (exams.isError) {
    content = <ErrorState title="Chưa tải được danh sách đề" onRetry={() => void exams.refetch()} retrying={exams.isRefetching} />;
  } else if (exams.data.length === 0) {
    content = (
      <EmptyState
        mark="空"
        title={level || status ? 'Không có đề nào khớp bộ lọc' : 'Chưa có đề nào'}
        description="Nhập đề từ file JSON (có file mẫu), hoặc tạo đề mới rồi soạn trực tiếp."
        action={
          <Link to="/quan-tri/de-thi/nhap" className={buttonClasses()}>
            Nhập đề
          </Link>
        }
      />
    );
  } else {
    content = (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">Danh sách đề thi</caption>
          <thead>
            <tr className="border-b border-rule-strong text-left text-ink-muted">
              <th scope="col" className="py-2 pr-3 font-medium">Đề</th>
              <th scope="col" className="py-2 pr-3 font-medium">Cấp</th>
              <th scope="col" className="py-2 pr-3 font-medium">Trạng thái</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Số câu</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Cần xem lại</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Lượt làm</th>
              <th scope="col" className="py-2 text-right font-medium">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {exams.data.map((exam) => (
              <ExamRow key={exam.id} exam={exam} onDelete={(e) => setDialog({ remove: e })} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Quản trị"
        description="Đề thi luyện JLPT: nhập, soạn, duyệt và xuất bản."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDialog('types')}>
              Dạng mondai
            </Button>
            <Link to="/quan-tri/de-thi/nhap" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              <Upload aria-hidden="true" className="size-4" />
              Nhập đề
            </Link>
            <Button size="sm" onClick={() => setDialog('create')}>
              <Plus aria-hidden="true" className="size-4" />
              Tạo đề
            </Button>
          </div>
        }
      />
      <AdminTabs />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex">
        <Select
          label="Cấp độ"
          hideLabel
          value={level}
          onChange={(e) => setLevel(e.target.value as JlptLevel | '')}
          options={[{ value: '', label: 'Mọi cấp độ' }, ...JLPT_LEVELS.map((l) => ({ value: l, label: l }))]}
        />
        <Select
          label="Trạng thái"
          hideLabel
          value={status}
          onChange={(e) => setStatus(e.target.value as ExamStatus | '')}
          options={[{ value: '', label: 'Mọi trạng thái' }, ...EXAM_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]}
        />
      </div>
      {content}

      {dialog === 'create' && <CreateExamModal onClose={() => setDialog(null)} />}
      {dialog === 'types' && <MondaiTypesModal onClose={() => setDialog(null)} />}
      {dialog && typeof dialog === 'object' && (
        <Modal
          open
          onClose={() => setDialog(null)}
          title={`Xóa đề “${dialog.remove.title}”?`}
          description="Đề chưa có ai làm nên xóa được. Thao tác này không hoàn tác được."
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(null)} data-autofocus>
                Không xóa
              </Button>
              <Button
                variant="danger"
                loading={remove.isPending}
                onClick={() =>
                  remove.mutate(dialog.remove.id, {
                    onSuccess: () => {
                      toast.success('Đã xóa đề');
                      setDialog(null);
                    },
                    onError: (error) => toast.error(isApiError(error) ? error.message : 'Chưa xóa được'),
                  })
                }
              >
                Xóa đề
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-muted">{dialog.remove.question_count} câu sẽ bị xóa cùng đề.</p>
        </Modal>
      )}
    </>
  );
}
