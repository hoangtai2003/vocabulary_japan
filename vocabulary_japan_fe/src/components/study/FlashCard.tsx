import { useEffect, useRef, type CSSProperties } from 'react';
import { Seal } from '@/components/ui/Seal';
import { useHotkeys, type HotkeyMap } from '@/hooks/useHotkeys';
import type { Quality } from '@/types/api';
import { WORD_TYPE_LABELS, type WordWithState } from '@/types/word';
import { cn } from '@/utils/cn';
import { GRADE_OPTIONS } from '@/utils/grades';
import { GradeButtons } from './GradeButtons';

export interface CardStamp {
  char: string;
  label: string;
}

export interface FlashCardProps {
  word: WordWithState;
  flipped: boolean;
  onFlip: () => void;
  onGrade: (quality: Quality) => void;
  showFurigana: boolean;
  topicName?: string;
  /** Khóa thao tác (đang lưu kết quả hoặc đang đóng dấu). */
  busy?: boolean;
  /** Con dấu son đóng lên góc thẻ ("Dễ" hoặc vừa đạt mastered). */
  stamp?: CardStamp | null;
  /** Ví dụ "Thẻ 3 trên 10", đọc cho trình đọc màn hình. */
  positionLabel?: string;
}

/**
 * Flashcard ô genkō. Mặt trước: chữ lớn (kanji có furigana, hoặc kana). Mặt sau: cách đọc,
 * nghĩa, loại từ, chủ đề, câu ví dụ.
 *
 * Phím tắt (xem useHotkeys): Space/Enter lật thẻ; sau khi lật, 1–4 hoặc ←/→ chấm điểm.
 * Bốn nút chấm chỉ hiện sau khi lật.
 */
export function FlashCard({
  word,
  flipped,
  onFlip,
  onGrade,
  showFurigana,
  topicName,
  busy = false,
  stamp = null,
  positionLabel,
}: FlashCardProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  // Đưa focus về vùng thẻ khi đổi thẻ hoặc lật, để phím tắt luôn dùng được và focus không
  // rơi vào nút vừa biến mất. Không focus vào nút chấm: Space khi đó sẽ bấm nhầm nút.
  useEffect(() => {
    const active = document.activeElement;
    if (
      !active ||
      active === document.body ||
      !document.body.contains(active) ||
      regionRef.current?.contains(active)
    ) {
      regionRef.current?.focus({ preventScroll: true });
    }
  }, [word.id, flipped]);

  const keys: HotkeyMap = { ' ': onFlip, Enter: onFlip };
  if (flipped) {
    for (const option of GRADE_OPTIONS) {
      for (const key of option.hotkeys) keys[key] = () => onGrade(option.quality);
    }
  }
  useHotkeys(keys, !busy);

  const glyph = word.kanji ?? word.kana;
  const glyphStyle = { '--chars': Math.max(1, [...glyph].length) } as CSSProperties;
  const [mainMeaning, ...otherMeanings] = word.meanings_vi;

  return (
    <div
      ref={regionRef}
      tabIndex={-1}
      role="group"
      aria-roledescription="thẻ"
      aria-label={positionLabel}
      className="mx-auto flex w-full max-w-[480px] flex-col gap-4 outline-none"
    >
      <div
        className="flip-card relative cursor-pointer select-none"
        data-flipped={flipped}
        onClick={() => !busy && onFlip()}
        data-testid="flashcard"
      >
        <div className="flip-card-inner">
          {/* Mặt trước */}
          <div
            aria-hidden={flipped}
            className="flip-face flip-face-front genko-cell flex aspect-square flex-col rounded-[var(--radius-card)]"
          >
            <div className="relative z-10 flex items-start justify-between p-3">
              {/* Chỗ dành sẵn cho nút ở mặt trước (ví dụ nút nghe) — thêm sau không đổi bố cục. */}
              <div data-slot="front-action" className="size-10" />
              <span className="text-xs font-medium text-ink-muted">{word.level}</span>
            </div>
            <div className="flex flex-1 items-center justify-center px-4 pb-14">
              <p
                lang="ja"
                className="card-glyph relative font-brush font-semibold"
                style={glyphStyle}
              >
                {word.kanji ? (
                  <ruby>
                    {word.kanji}
                    <rt className={showFurigana ? undefined : 'invisible'}>{word.kana}</rt>
                  </ruby>
                ) : (
                  word.kana
                )}
              </p>
            </div>
          </div>

          {/* Mặt sau */}
          <div
            aria-hidden={!flipped}
            className="flip-face flip-face-back flex flex-col gap-4 rounded-[var(--radius-card)] border border-rule bg-surface p-5 text-left"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pr-14">
              <span lang="ja" className="font-brush text-4xl font-semibold">
                {glyph}
              </span>
              {word.kanji && (
                <span lang="ja" className="font-jp text-lg">
                  {word.kana}
                </span>
              )}
              <span className="text-ink-muted">{word.romaji}</span>
            </div>
            <div>
              <p className="text-xl font-semibold">{mainMeaning}</p>
              {otherMeanings.length > 0 && (
                <p className="text-ink-muted">{otherMeanings.join('; ')}</p>
              )}
            </div>
            <p className="text-sm text-ink-muted">
              {WORD_TYPE_LABELS[word.type]}
              {topicName ? ` · ${topicName}` : ''}
            </p>
            <div className="flex flex-col gap-0.5 border-t border-rule pt-3">
              <p lang="ja" className="font-jp text-lg">
                {word.example_jp}
              </p>
              <p lang="ja" className="font-jp text-sm text-ink-muted">
                {word.example_kana}
              </p>
              <p className="text-sm italic text-ink-muted">{word.example_romaji}</p>
              <p className="mt-1">{word.example_vi}</p>
            </div>
          </div>
        </div>

        {stamp && (
          <Seal
            char={stamp.char}
            label={stamp.label}
            size="lg"
            className="absolute right-4 top-4 z-20 animate-stamp bg-surface/60"
          />
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {flipped ? `${mainMeaning}. ${word.example_vi}` : ''}
        {stamp ? ` ${stamp.label}!` : ''}
      </p>

      <div className="min-h-14">
        {flipped ? (
          <GradeButtons onGrade={onGrade} disabled={busy} />
        ) : (
          <button
            type="button"
            onClick={onFlip}
            disabled={busy}
            aria-keyshortcuts="Space Enter"
            className={cn(
              'flex h-14 w-full items-center justify-center gap-3 rounded-[var(--radius-control)] border border-rule-strong bg-surface',
              'font-semibold hover:border-ink active:translate-y-px',
            )}
          >
            Lật thẻ
            <kbd
              aria-hidden="true"
              className="border border-rule px-1.5 font-sans text-xs font-normal text-ink-muted"
            >
              Space
            </kbd>
          </button>
        )}
      </div>
    </div>
  );
}
