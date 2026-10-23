import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { Explanation, GrammarPoint, VocabItem } from '@/types/exam';
import { MarkupField } from './MarkupField';

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-son-wash hover:text-son-ink"
    >
      <Trash2 aria-hidden="true" className="size-4" />
    </button>
  );
}

/**
 * Trình soạn lời giải 6 ô (FR-CMS-10): đáp án, câu hoàn chỉnh + bản dịch, vì sao đúng, vì sao sai,
 * danh sách ngữ pháp (mẫu, giải thích, ví dụ mỗi dòng một câu), danh sách từ vựng (từ, cách đọc,
 * nghĩa, dấu "có trong kho" — server tự gắn mã từ khi kanji và cách đọc khớp).
 */
export function ExplanationEditor({ value, onChange }: { value: Explanation; onChange: (value: Explanation) => void }) {
  const set = (patch: Partial<Explanation>) => onChange({ ...value, ...patch });
  const setGrammar = (index: number, patch: Partial<GrammarPoint>) =>
    set({ grammar: value.grammar.map((g, i) => (i === index ? { ...g, ...patch } : g)) });
  const setVocab = (index: number, patch: Partial<VocabItem>) =>
    // Sửa từ hoặc cách đọc thì bỏ mã cũ để server gắn lại theo nội dung mới.
    set({
      vocab: value.vocab.map((v, i) =>
        i === index ? { ...v, ...patch, ...('word' in patch || 'reading' in patch ? { word_id: null } : {}) } : v,
      ),
    });

  return (
    <fieldset className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-rule p-4">
      <legend className="px-1 text-base font-semibold">Lời giải</legend>
      <MarkupField label="(1) Đáp án" lang="vi" value={value.answer} onChange={(v) => set({ answer: v })} compact tools={['furigana']} />
      <MarkupField
        label="(2) Câu hoàn chỉnh có furigana"
        value={value.full_sentence}
        onChange={(v) => set({ full_sentence: v })}
        rows={2}
        tools={['furigana', 'bold']}
      />
      <Textarea label="Bản dịch câu hoàn chỉnh" value={value.translation_vi} onChange={(e) => set({ translation_vi: e.target.value })} rows={2} />
      <MarkupField
        label="(3) Vì sao đúng"
        lang="vi"
        value={value.why_correct}
        onChange={(v) => set({ why_correct: v })}
        rows={3}
        tools={['furigana', 'bold']}
      />
      <MarkupField
        label="(4) Vì sao các lựa chọn khác sai"
        lang="vi"
        value={value.why_wrong}
        onChange={(v) => set({ why_wrong: v })}
        rows={3}
        tools={['furigana', 'bold']}
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">(5) Ngữ pháp</p>
        {value.grammar.map((g, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-[var(--radius-control)] border border-rule p-3">
            <div className="flex items-end gap-2">
              <Input
                label={`Mẫu ${index + 1}`}
                containerClassName="flex-1"
                value={g.pattern}
                onChange={(e) => setGrammar(index, { pattern: e.target.value })}
                placeholder="Vてしまう"
              />
              <RemoveButton label={`Xóa mẫu ngữ pháp ${index + 1}`} onClick={() => set({ grammar: value.grammar.filter((_, i) => i !== index) })} />
            </div>
            <Textarea label="Giải thích" value={g.explanation} onChange={(e) => setGrammar(index, { explanation: e.target.value })} rows={2} />
            <Textarea
              label="Ví dụ (mỗi dòng một câu)"
              lang="ja"
              value={g.examples.join('\n')}
              onChange={(e) => setGrammar(index, { examples: e.target.value.split('\n') })}
              rows={2}
            />
          </div>
        ))}
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => set({ grammar: [...value.grammar, { pattern: '', explanation: '', examples: [] }] })}
        >
          <Plus aria-hidden="true" className="size-4" />
          Thêm mẫu ngữ pháp
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">(6) Từ vựng</p>
        {value.vocab.map((v, index) => (
          <div key={index} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1.5fr_auto]">
            <Input label={`Từ ${index + 1}`} lang="ja" value={v.word} onChange={(e) => setVocab(index, { word: e.target.value })} />
            <Input label="Cách đọc" lang="ja" value={v.reading} onChange={(e) => setVocab(index, { reading: e.target.value })} />
            <Input label="Nghĩa" value={v.meaning} onChange={(e) => setVocab(index, { meaning: e.target.value })} />
            <div className="flex items-center gap-2">
              <span
                className={
                  v.word_id
                    ? 'whitespace-nowrap text-xs font-semibold text-moss-ink'
                    : 'whitespace-nowrap text-xs text-ink-muted'
                }
                title={v.word_id ? `Mã từ: ${v.word_id}` : 'Kho từ vựng chưa có từ này'}
              >
                {v.word_id ? 'Có trong kho' : 'Chưa có trong kho'}
              </span>
              <RemoveButton label={`Xóa từ ${index + 1}`} onClick={() => set({ vocab: value.vocab.filter((_, i) => i !== index) })} />
            </div>
          </div>
        ))}
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => set({ vocab: [...value.vocab, { word: '', reading: '', meaning: '', word_id: null }] })}
        >
          <Plus aria-hidden="true" className="size-4" />
          Thêm từ
        </Button>
      </div>
    </fieldset>
  );
}
