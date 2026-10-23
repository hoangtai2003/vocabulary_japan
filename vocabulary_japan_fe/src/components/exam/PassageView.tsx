import { useState } from 'react';
import { cn } from '@/utils/cn';
import { Markup } from './Markup';

export interface PassageViewProps {
  passage: {
    label: string;
    intro: string;
    content: string;
    content_furigana?: string | null;
    translation_vi?: string | null;
  };
  /** Số câu đang làm, để tô chỗ trống [[n]] tương ứng (FR-RUN-10). */
  activeBlank?: number | null;
  /** Cho bật bản có furigana và bản dịch (FR-EXP-04): sau khi nộp, hoặc khi đã trả lời ở chế độ luyện. */
  showSolutionToggles?: boolean;
  className?: string;
}

function Toggle({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'h-8 rounded-[var(--radius-control)] border px-2.5 text-sm font-medium',
        pressed ? 'border-ink bg-ink text-paper' : 'border-rule-strong bg-surface hover:border-ink',
      )}
    >
      {children}
    </button>
  );
}

/**
 * Bài đọc: nhãn （1）, câu dẫn ngữ cảnh, nội dung (đoạn văn, bảng, ảnh). Khi được phép, người học
 * bật bản đọc kèm furigana (thay cho bản trong đề) và bản dịch tiếng Việt toàn bài.
 */
export function PassageView({ passage, activeBlank, showSolutionToggles = false, className }: PassageViewProps) {
  const [furigana, setFurigana] = useState(false);
  const [translation, setTranslation] = useState(false);
  const hasFurigana = Boolean(passage.content_furigana?.trim());
  const hasTranslation = Boolean(passage.translation_vi?.trim());
  const content = furigana && hasFurigana ? passage.content_furigana! : passage.content;

  return (
    <article className={cn('flex flex-col gap-3', className)}>
      {(passage.label || passage.intro) && (
        <p lang="ja" className="exam-text font-medium">
          {passage.label && <span className="mr-2">{passage.label}</span>}
          {passage.intro && <Markup source={passage.intro} inline />}
        </p>
      )}
      {showSolutionToggles && (hasFurigana || hasTranslation) && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Cách hiển thị bài đọc">
          {hasFurigana && (
            <Toggle pressed={furigana} onClick={() => setFurigana((v) => !v)}>
              Bản có furigana
            </Toggle>
          )}
          {hasTranslation && (
            <Toggle pressed={translation} onClick={() => setTranslation((v) => !v)}>
              Bản dịch
            </Toggle>
          )}
        </div>
      )}
      <div className="rounded-[var(--radius-card)] border border-rule bg-surface p-4">
        <Markup source={content} activeBlank={activeBlank} />
      </div>
      {translation && hasTranslation && (
        <div className="border-l-[3px] border-rule-strong pl-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Bản dịch</p>
          <Markup source={passage.translation_vi!} lang="vi" className="text-[15px] leading-relaxed" />
        </div>
      )}
    </article>
  );
}
