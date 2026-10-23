import { examAdminApi } from '@/api/examAdminApi';
import { isApiError } from '@/api/client';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAutosave } from '@/hooks/useAutosave';
import { useSetExamTree } from '@/hooks/queries/useExamAdmin';
import type { AdminExam, AdminMondai, AdminPassage, AdminSection, ExamInfoInput, MondaiType } from '@/types/exam';
import { JLPT_LEVELS, type JlptLevel } from '@/types/word';
import { STANDARD_SECTIONS } from '@/utils/exam';
import { MarkupField } from './MarkupField';
import { patchMondai, patchPassage, patchSection, usePatchExam } from './editorCache';

/** Lỗi lưu gần nhất: lỗi theo trường của server, hoặc thông báo chung. */
export function SaveError({ error }: { error: unknown }) {
  if (!error) return null;
  const message = isApiError(error)
    ? Object.entries(error.fields ?? {})
        .map(([, m]) => m)
        .join(' · ') || error.message
    : 'Chưa lưu được. Kiểm tra mạng, thay đổi sẽ được gửi lại ở lần sửa tiếp theo.';
  return (
    <p role="alert" className="border-l-[3px] border-son bg-son-wash/60 px-3 py-2 text-sm font-medium">
      Chưa lưu: {message}
    </p>
  );
}

export function FormHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-xl">{title}</h2>
      {description && <p className="text-sm text-ink-muted">{description}</p>}
    </div>
  );
}

const numberOrNull = (value: string) => (value.trim() === '' ? null : Math.max(0, Math.trunc(Number(value))) || null);

// ---------- Thông tin đề (FR-CMS-02) ----------

export function ExamInfoForm({ exam }: { exam: AdminExam }) {
  const setTree = useSetExamTree();
  const initial: ExamInfoInput = {
    title: exam.title,
    level: exam.level,
    difficulty: exam.difficulty,
    description: exam.description,
    instructions: exam.instructions,
    source: exam.source,
  };
  const { draft, update, error } = useAutosave(initial, async (changes) => {
    setTree(await examAdminApi.updateInfo(exam.id, changes));
  });

  return (
    <div className="flex flex-col gap-4">
      <FormHeading title="Thông tin đề" description="Tự lưu khi bạn ngừng gõ. Nguồn của đề là bắt buộc (NFR-EX-11)." />
      <SaveError error={error} />
      <Input label="Tên đề" value={draft.title} onChange={(e) => update({ title: e.target.value })} maxLength={120} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Cấp độ"
          value={draft.level}
          onChange={(e) => update({ level: e.target.value as JlptLevel })}
          options={JLPT_LEVELS.map((l) => ({ value: l, label: l }))}
          hint={exam.attempt_count > 0 ? 'Đề đã có lượt làm, không đổi được cấp độ.' : undefined}
          disabled={exam.attempt_count > 0}
        />
        <Input
          label="Độ khó"
          value={draft.difficulty ?? ''}
          onChange={(e) => update({ difficulty: e.target.value || null })}
          placeholder="Ví dụ: Cơ bản, Nâng cao"
          maxLength={40}
        />
      </div>
      <Input
        label="Nguồn của đề"
        value={draft.source}
        onChange={(e) => update({ source: e.target.value })}
        hint="Ví dụ: Tự soạn. Chỉ đưa lên app đề bạn có quyền sử dụng."
        maxLength={200}
      />
      <MarkupField label="Mô tả" lang="vi" value={draft.description} onChange={(v) => update({ description: v })} tools={['bold']} />
      <MarkupField
        label="Hướng dẫn làm bài"
        lang="vi"
        value={draft.instructions}
        onChange={(v) => update({ instructions: v })}
        tools={['bold']}
      />
    </div>
  );
}

// ---------- Phần thi (FR-CMS-04) ----------

export function SectionForm({ examId, level, section }: { examId: string; level: JlptLevel; section: AdminSection }) {
  const patch = usePatchExam(examId);
  const initial = {
    title: section.title,
    duration_minutes: section.duration_minutes,
    score_group: section.score_group,
  };
  const { draft, update, error } = useAutosave(initial, async (changes) => {
    const saved = await examAdminApi.updateSection(section.id, changes);
    patch(patchSection(section.id, saved));
  });
  const standard = STANDARD_SECTIONS[level][section.position];

  return (
    <div className="flex flex-col gap-4">
      <FormHeading title={`Phần thi ${section.position + 1}`} />
      <SaveError error={error} />
      <Input label="Tên phần thi" lang="ja" value={draft.title} onChange={(e) => update({ title: e.target.value })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Thời gian (phút)"
          type="number"
          inputMode="numeric"
          min={1}
          max={300}
          value={draft.duration_minutes ?? ''}
          onChange={(e) => update({ duration_minutes: numberOrNull(e.target.value) })}
          hint={standard ? `Chuẩn ${level}: ${standard.minutes} phút` : undefined}
        />
        <Input label="Nhóm điểm" value={draft.score_group} onChange={(e) => update({ score_group: e.target.value })} />
      </div>
      <p className="text-sm text-ink-muted">Loại phần thi: đọc. Phần Nghe sẽ được thêm sau (DR-EX-12).</p>
    </div>
  );
}

// ---------- Mondai (FR-CMS-04) ----------

export function MondaiForm({
  examId,
  mondai,
  types,
  level,
}: {
  examId: string;
  mondai: AdminMondai;
  types: MondaiType[];
  level: JlptLevel;
}) {
  const patch = usePatchExam(examId);
  const initial = { number: mondai.number, type_id: mondai.type_id, instructions: mondai.instructions, tip: mondai.tip };
  const { draft, update, error } = useAutosave(initial, async (changes) => {
    const saved = await examAdminApi.updateMondai(mondai.id, changes);
    patch(patchMondai(mondai.id, saved));
  });
  const options = types.filter((t) => t.level === level);
  const type = types.find((t) => t.id === draft.type_id);

  return (
    <div className="flex flex-col gap-4">
      <FormHeading title={`問題${draft.number}`} description={type ? `${type.label_ja} · ${type.name_vi}` : 'Chưa chọn dạng'} />
      <SaveError error={error} />
      <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <Input
          label="Số hiệu"
          type="number"
          min={1}
          max={99}
          value={draft.number}
          onChange={(e) => update({ number: numberOrNull(e.target.value) ?? 1 })}
        />
        <Select
          label="Dạng mondai"
          value={draft.type_id ?? ''}
          onChange={(e) => update({ type_id: e.target.value || null })}
          options={[
            { value: '', label: 'Chọn dạng' },
            ...options.map((t) => ({
              value: t.id,
              label: `${t.label_ja} · ${t.name_vi} (${t.answer_kind === 'star' ? 'câu ★' : 'chọn 1 trong 4'}${t.has_passage ? ', có bài đọc' : ''})`,
            })),
          ]}
        />
      </div>
      <MarkupField
        label="Câu hướng dẫn (tiếng Nhật)"
        value={draft.instructions}
        onChange={(v) => update({ instructions: v })}
        rows={2}
      />
      {type && type.default_instructions && draft.instructions !== type.default_instructions && (
        <button
          type="button"
          onClick={() => update({ instructions: type.default_instructions })}
          className="-mt-2 self-start text-sm font-semibold text-son-ink underline underline-offset-4"
        >
          Dùng câu hướng dẫn mặc định của dạng
        </button>
      )}
      <MarkupField
        label="Mẹo làm bài (tiếng Việt, tùy chọn)"
        lang="vi"
        value={draft.tip}
        onChange={(v) => update({ tip: v })}
        tools={['bold', 'furigana']}
        rows={4}
        hint="Hiện ở đầu phần lời giải của mondai này (FR-EXP-05)."
      />
    </div>
  );
}

// ---------- Bài đọc (FR-CMS-09) ----------

export function PassageForm({ examId, passage, index }: { examId: string; passage: AdminPassage; index: number }) {
  const patch = usePatchExam(examId);
  const initial = {
    label: passage.label,
    intro: passage.intro,
    content: passage.content,
    content_furigana: passage.content_furigana,
    translation_vi: passage.translation_vi,
  };
  const { draft, update, error } = useAutosave(initial, async (changes) => {
    const saved = await examAdminApi.updatePassage(passage.id, changes);
    patch(patchPassage(passage.id, saved));
  });

  return (
    <div className="flex flex-col gap-4">
      <FormHeading
        title={`Bài đọc ${draft.label || index + 1}`}
        description="Bảng dùng cú pháp bảng Markdown. Chỗ trống đánh số [[18]] trỏ tới câu 18 của phần thi."
      />
      <SaveError error={error} />
      <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <Input label="Nhãn" lang="ja" value={draft.label} onChange={(e) => update({ label: e.target.value })} placeholder="（1）" />
        <MarkupField
          label="Câu dẫn ngữ cảnh"
          value={draft.intro}
          onChange={(v) => update({ intro: v })}
          compact
          tools={['furigana']}
        />
      </div>
      <MarkupField
        label="Nội dung (bản trong đề)"
        value={draft.content}
        onChange={(v) => update({ content: v })}
        rows={10}
        tools={['furigana', 'underline', 'bold', 'blank', 'numbered', 'image']}
      />
      <MarkupField
        label="Bản đọc kèm furigana (lời giải)"
        value={draft.content_furigana}
        onChange={(v) => update({ content_furigana: v })}
        rows={8}
        tools={['furigana', 'bold', 'numbered']}
        hint="Người học bật/tắt được sau khi nộp bài (FR-EXP-04)."
      />
      <Textarea
        label="Bản dịch tiếng Việt toàn bài"
        value={draft.translation_vi}
        onChange={(e) => update({ translation_vi: e.target.value })}
        rows={8}
      />
    </div>
  );
}
