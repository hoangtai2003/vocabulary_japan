import { History } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { examAdminApi } from '@/api/examAdminApi';
import { isApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { useQuestionHistory } from '@/hooks/queries/useExamAdmin';
import { useAutosave } from '@/hooks/useAutosave';
import type { AdminMondai, AdminQuestion, AnswerKind, Explanation, MondaiType, QuestionInput } from '@/types/exam';
import { starAnswer } from '@/utils/exam';
import { formatDateTime } from '@/utils/examFormat';
import { cn } from '@/utils/cn';
import { ExplanationEditor } from './ExplanationEditor';
import { FormHeading, SaveError } from './EntityForms';
import { MarkupField } from './MarkupField';
import { patchQuestion, usePatchExam } from './editorCache';

type Draft = Required<Omit<QuestionInput, 'confirm_regrade' | 'attachments'>>;

const ANSWER_FIELDS: (keyof Draft)[] = ['correct_option', 'star_order', 'star_position', 'kind'];

const FIELD_LABELS: Record<string, string> = {
  passage_id: 'bài đọc',
  kind: 'kiểu câu',
  number_override: 'số câu',
  prompt: 'đề',
  options: 'lựa chọn',
  correct_option: 'đáp án đúng',
  star_prefix: 'phần đầu câu',
  star_suffix: 'phần cuối câu',
  star_position: 'ô ★',
  star_order: 'thứ tự đúng',
  explanation: 'lời giải',
  learner_note: 'ghi chú cho người học',
  needs_review: 'cờ cần xem lại',
  internal_note: 'ghi chú nội bộ',
  attachments: 'tệp đính kèm',
};

const toDraft = (q: AdminQuestion): Draft => ({
  passage_id: q.passage_id,
  kind: q.kind,
  number_override: q.number_override,
  prompt: q.prompt,
  options: [0, 1, 2, 3].map((i) => q.options[i] ?? ''),
  correct_option: q.correct_option,
  star_prefix: q.star_prefix,
  star_suffix: q.star_suffix,
  star_position: q.star_position,
  // Bản nháp luôn đủ 4 ô (0 = chưa chọn); gửi lên server chỉ khi đủ 4 mảnh.
  star_order: [0, 1, 2, 3].map((i) => q.star_order[i] ?? 0),
  explanation: q.explanation,
  learner_note: q.learner_note,
  needs_review: q.needs_review,
  internal_note: q.internal_note,
});

/** Bỏ dòng ngữ pháp/từ vựng còn trống trước khi gửi (đang thêm dở), để không bị lỗi bắt buộc nhập. */
function cleanExplanation(e: Explanation): Explanation {
  return {
    ...e,
    grammar: e.grammar
      .filter((g) => g.pattern.trim())
      .map((g) => ({ ...g, examples: g.examples.map((x) => x.trim()).filter(Boolean) })),
    vocab: e.vocab.filter((v) => v.word.trim()),
  };
}

function HistoryPanel({ questionId }: { questionId: string }) {
  const history = useQuestionHistory(questionId, true);
  if (history.isPending) return <Spinner />;
  if (history.isError) return <p className="text-sm text-son-ink">Chưa tải được lịch sử.</p>;
  if (history.data.length === 0) return <p className="text-sm text-ink-muted">Chưa có lần sửa nào sau khi tạo.</p>;
  return (
    <ul className="divide-y divide-rule text-sm">
      {history.data.map((edit) => (
        <li key={edit.id} className="py-2">
          <p>
            <span className="font-medium">{edit.editor?.display_name ?? 'Tài khoản đã xóa'}</span>
            <span className="text-ink-muted"> · {formatDateTime(edit.edited_at)}</span>
          </p>
          <p className="text-ink-muted">Sửa: {edit.fields.map((f) => FIELD_LABELS[f] ?? f).join(', ')}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Soạn một câu hỏi (FR-CMS-06 đến 10, 15, 16, 18): đề, 4 lựa chọn và đáp án; câu ★ thì phần đầu,
 * phần cuối, 4 mảnh, ô ★ và thứ tự đúng (đáp án tự tính); lời giải 6 ô; cờ cần xem lại và ghi chú
 * nội bộ. Tự lưu; đổi đáp án đúng của câu đã có bài làm thì hỏi xác nhận chấm lại.
 */
export function QuestionForm({
  examId,
  question,
  mondai,
  type,
}: {
  examId: string;
  question: AdminQuestion;
  mondai: AdminMondai;
  type: MondaiType | undefined;
}) {
  const patch = usePatchExam(examId);
  const [confirm, setConfirm] = useState<{ message: string; resolve: (ok: boolean) => void } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const revertRef = useRef<(fields: (keyof Draft)[]) => void>(() => undefined);

  const { draft, update, error, revert } = useAutosave<Draft>(toDraft(question), async (changes) => {
    const body: QuestionInput = { ...changes };
    if (changes.explanation) body.explanation = cleanExplanation(changes.explanation);
    if (changes.star_order) body.star_order = changes.star_order.every((n) => n > 0) ? changes.star_order : [];
    try {
      patch(patchQuestion(await examAdminApi.updateQuestion(question.id, body)));
      return changes;
    } catch (e) {
      if (!isApiError(e) || e.code !== 'CONFIRM_REGRADE') throw e;
      const ok = await new Promise<boolean>((resolve) => setConfirm({ message: e.message, resolve }));
      setConfirm(null);
      if (ok) {
        patch(patchQuestion(await examAdminApi.updateQuestion(question.id, { ...body, confirm_regrade: true })));
        return changes;
      }
      // Không xác nhận: lưu các trường khác, trả đáp án về như cũ.
      const rest = Object.fromEntries(Object.entries(body).filter(([k]) => !ANSWER_FIELDS.includes(k as keyof Draft)));
      if (Object.keys(rest).length > 0) patch(patchQuestion(await examAdminApi.updateQuestion(question.id, rest)));
      setTimeout(() => revertRef.current(ANSWER_FIELDS), 0);
      return Object.fromEntries(Object.entries(changes).filter(([k]) => !ANSWER_FIELDS.includes(k as keyof Draft))) as Partial<Draft>;
    }
  });
  revertRef.current = revert;

  const setOption = (index: number, value: string) => update({ options: draft.options.map((o, i) => (i === index ? value : o)) });
  const kind: AnswerKind = draft.kind;
  const computed = kind === 'star' ? starAnswer(draft.star_order, draft.star_position) || null : null;
  const preview = `/quan-tri/de-thi/${examId}/xem-truoc?cau=${question.id}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <FormHeading
          title={`Câu ${question.number}`}
          description={`問題${mondai.number}${type ? ` · ${type.name_vi}` : ''} · ${kind === 'star' ? 'Câu ★' : 'Chọn 1 trong 4'}`}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
            <History aria-hidden="true" className="size-4" />
            Lịch sử sửa
          </Button>
          <Link to={preview} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            Xem trước
          </Link>
        </div>
      </div>
      <SaveError error={error} />

      <label
        className={cn(
          'flex items-start gap-3 rounded-[var(--radius-control)] border px-3 py-2',
          draft.needs_review ? 'border-son bg-son-wash/50' : 'border-rule',
        )}
      >
        <input
          type="checkbox"
          checked={draft.needs_review}
          onChange={(e) => update({ needs_review: e.target.checked })}
          className="mt-1 size-4 accent-[var(--son)]"
        />
        <span>
          <span className="font-medium">Cần xem lại</span>
          <span className="block text-sm text-ink-muted">Cờ và ghi chú nội bộ người học không thấy (FR-CMS-15).</span>
        </span>
      </label>
      <Textarea
        label="Ghi chú nội bộ"
        value={draft.internal_note}
        onChange={(e) => update({ internal_note: e.target.value })}
        rows={2}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label="Kiểu câu"
          value={kind}
          onChange={(e) => update({ kind: e.target.value as AnswerKind })}
          options={[
            { value: 'choice', label: 'Chọn 1 trong 4' },
            { value: 'star', label: 'Câu ★' },
          ]}
          hint={type && type.answer_kind !== kind ? 'Khác kiểu của dạng mondai' : undefined}
        />
        <Input
          label="Ghi đè số câu"
          type="number"
          min={1}
          max={999}
          value={draft.number_override ?? ''}
          onChange={(e) => update({ number_override: e.target.value ? Number(e.target.value) : null })}
          hint={`Bỏ trống: tự đánh số (đang là ${question.number})`}
        />
        {mondai.passages.length > 0 && (
          <Select
            label="Bài đọc"
            value={draft.passage_id ?? ''}
            onChange={(e) => update({ passage_id: e.target.value || null })}
            options={[
              { value: '', label: 'Không gắn bài đọc' },
              ...mondai.passages.map((p, i) => ({ value: p.id, label: `Bài đọc ${p.label || i + 1}` })),
            ]}
          />
        )}
      </div>

      {kind === 'choice' ? (
        <>
          <MarkupField
            label="Đề"
            value={draft.prompt}
            onChange={(v) => update({ prompt: v })}
            rows={2}
            hint="Phần được hỏi đặt trong 【 】. Câu điền vào bài đọc có thể để trống."
          />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium">4 lựa chọn và đáp án đúng</legend>
            {draft.options.map((option, index) => (
              <div key={index} className="flex items-start gap-3">
                <label className="mt-8 flex shrink-0 items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name={`correct-${question.id}`}
                    checked={draft.correct_option === index + 1}
                    onChange={() => update({ correct_option: index + 1 })}
                    className="size-4 accent-[var(--moss)]"
                  />
                  <span className="sr-only">Lựa chọn {index + 1} là đáp án đúng</span>
                  <span aria-hidden="true">Đúng</span>
                </label>
                <div className="min-w-0 flex-1">
                  <MarkupField
                    label={`Lựa chọn ${index + 1}`}
                    value={option}
                    onChange={(v) => setOption(index, v)}
                    compact
                    tools={['furigana', 'underline']}
                  />
                </div>
              </div>
            ))}
          </fieldset>
        </>
      ) : (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">Câu ★</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <MarkupField label="Phần đầu câu" value={draft.star_prefix} onChange={(v) => update({ star_prefix: v })} compact tools={['furigana']} />
            <MarkupField label="Phần cuối câu" value={draft.star_suffix} onChange={(v) => update({ star_suffix: v })} compact tools={['furigana']} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {draft.options.map((option, index) => (
              <MarkupField
                key={index}
                label={`Mảnh ${index + 1}`}
                value={option}
                onChange={(v) => setOption(index, v)}
                compact
                tools={['furigana']}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <Select
              label="Ô ★"
              value={String(draft.star_position ?? '')}
              onChange={(e) => update({ star_position: e.target.value ? Number(e.target.value) : null })}
              options={[{ value: '', label: 'Chọn ô' }, ...[1, 2, 3, 4].map((n) => ({ value: String(n), label: `Ô ${n}` }))]}
            />
            {[0, 1, 2, 3].map((slot) => (
              <Select
                key={slot}
                label={`Ô ${slot + 1}${draft.star_position === slot + 1 ? ' ★' : ''}`}
                value={String(draft.star_order[slot] || '')}
                onChange={(e) =>
                  update({ star_order: draft.star_order.map((n, i) => (i === slot ? Number(e.target.value) || 0 : n)) })
                }
                options={[{ value: '', label: '–' }, ...[1, 2, 3, 4].map((n) => ({ value: String(n), label: `Mảnh ${n}` }))]}
              />
            ))}
          </div>
          <p className="text-sm">
            Đáp án (mảnh ở ô ★):{' '}
            <strong className="tabular-nums">{computed ?? 'chưa đủ thông tin'}</strong>
          </p>
        </fieldset>
      )}

      <MarkupField
        label="Ghi chú cho người học"
        lang="vi"
        value={draft.learner_note}
        onChange={(v) => update({ learner_note: v })}
        rows={2}
        tools={['bold', 'furigana']}
        hint="Hiện nổi bật trong lời giải, ví dụ khi câu có điểm chưa chặt (FR-EXP-06)."
      />

      <ExplanationEditor value={draft.explanation} onChange={(explanation) => update({ explanation })} />

      <Modal
        open={confirm !== null}
        onClose={() => confirm?.resolve(false)}
        title="Chấm lại các bài đã nộp?"
        description={confirm?.message}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => confirm?.resolve(false)} data-autofocus>
              Giữ đáp án cũ
            </Button>
            <Button onClick={() => confirm?.resolve(true)}>Đổi đáp án, chấm lại</Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Kết quả của các lượt đó sẽ ghi chú “Đề đã được cập nhật sau lần làm này”. Việc chấm lại chạy nền.
        </p>
      </Modal>
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={`Lịch sử sửa · Câu ${question.number}`} size="md">
        <HistoryPanel questionId={question.id} />
      </Modal>
    </div>
  );
}
