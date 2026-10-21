import { Check, X } from 'lucide-react';
import { useEffect, useRef, type CSSProperties } from 'react';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useHotkeys, type HotkeyMap } from '@/hooks/useHotkeys';
import type { QuizMode, QuizQuestion as QuizQuestionData } from '@/types/api';
import { cn } from '@/utils/cn';

export interface QuizQuestionProps {
  question: QuizQuestionData;
  mode: QuizMode;
  /** Thứ tự câu, bắt đầu từ 0 */
  index: number;
  total: number;
  /** Đáp án đã chọn; có giá trị thì câu đã khóa. */
  selectedId: string | null;
  onSelect: (optionId: string) => void;
  onNext: () => void;
  nextLabel: string;
  nextLoading?: boolean;
}

type OptionState = 'idle' | 'correct' | 'wrong' | 'dimmed';

const optionClass: Record<OptionState, string> = {
  idle: 'border-rule-strong bg-surface hover:border-ink',
  correct: 'border-moss bg-moss-wash text-ink',
  wrong: 'border-son bg-son-wash text-ink',
  dimmed: 'border-rule bg-surface text-ink-muted',
};

/**
 * Bước 2: một câu hỏi. Chọn xong thì tô đúng/sai ngay, khóa các đáp án, hiện cách đọc và nút
 * "Tiếp". Phím 1–4 chọn đáp án; Enter sang câu tiếp. Sau khi chọn, focus chuyển sang nút
 * "Tiếp" để Enter/Space bấm đúng nút đó.
 */
export function QuizQuestion({
  question,
  mode,
  index,
  total,
  selectedId,
  onSelect,
  onNext,
  nextLabel,
  nextLoading = false,
}: QuizQuestionProps) {
  const answered = selectedId !== null;
  const correct = selectedId === question.correct_option_id;
  const nextRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);

  // Câu mới: đưa focus lên đề để trình đọc màn hình đọc từ đầu.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [question.id]);

  const keys: HotkeyMap = {};
  if (!answered) {
    question.options.forEach((option, i) => {
      keys[String(i + 1)] = () => onSelect(option.id);
    });
  } else if (!nextLoading) {
    keys.Enter = onNext;
  }
  useHotkeys(keys);

  const stateOf = (optionId: string): OptionState => {
    if (!answered) return 'idle';
    if (optionId === question.correct_option_id) return 'correct';
    if (optionId === selectedId) return 'wrong';
    return 'dimmed';
  };

  const correctText = question.options.find((o) => o.id === question.correct_option_id)?.text ?? '';
  const promptIsJapanese = mode === 'jp_vi';

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5">
      <div className="flex items-center gap-3">
        <ProgressBar
          value={index}
          max={total}
          label="Tiến độ quiz"
          valueText={`Câu ${index + 1} trên ${total}`}
        />
        <p className="shrink-0 text-sm tabular-nums text-ink-muted">
          Câu {index + 1}/{total}
        </p>
      </div>

      <div className="genko-cell flex min-h-44 flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] px-4 py-8 text-center">
        <h1
          ref={headingRef}
          tabIndex={-1}
          lang={promptIsJapanese ? 'ja' : 'vi'}
          style={
            promptIsJapanese
              ? ({ '--chars': [...question.prompt].length } as CSSProperties)
              : undefined
          }
          className={cn(
            'relative outline-none',
            promptIsJapanese ? 'quiz-glyph font-brush font-semibold' : 'text-[28px] md:text-[32px]',
          )}
        >
          <span className="sr-only">Câu {index + 1}: </span>
          {question.prompt}
        </h1>
        <p
          lang="ja"
          className={cn('relative min-h-6 font-jp text-ink-muted', !answered && 'invisible')}
        >
          {answered ? question.prompt_sub : null}
        </p>
      </div>

      <ul className="grid gap-2" aria-label="Đáp án">
        {question.options.map((option, i) => {
          const state = stateOf(option.id);
          return (
            <li key={option.id}>
              <button
                type="button"
                data-state={state}
                aria-disabled={answered || undefined}
                onClick={() => !answered && onSelect(option.id)}
                aria-keyshortcuts={String(i + 1)}
                className={cn(
                  'flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2 text-left transition-colors',
                  answered && 'cursor-default',
                  optionClass[state],
                )}
              >
                <kbd
                  aria-hidden="true"
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center border font-sans text-sm',
                    state === 'correct'
                      ? 'border-moss bg-moss text-paper'
                      : state === 'wrong'
                        ? 'border-son bg-son text-on-son'
                        : 'border-rule',
                  )}
                >
                  {i + 1}
                </kbd>
                <span
                  lang={promptIsJapanese ? 'vi' : 'ja'}
                  className={cn('flex-1', !promptIsJapanese && 'font-jp text-lg')}
                >
                  {option.text}
                </span>
                {state === 'correct' && (
                  <Check aria-hidden="true" className="size-5 text-moss-ink" />
                )}
                {state === 'wrong' && <X aria-hidden="true" className="size-5 text-son-ink" />}
                {state === 'correct' && <span className="sr-only">, đáp án đúng</span>}
                {state === 'wrong' && <span className="sr-only">, bạn chọn, chưa đúng</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3">
        <p role="status" className="font-medium">
          {answered &&
            (correct ? (
              <span className="text-moss-ink">Đúng rồi!</span>
            ) : (
              <span className="text-son-ink">
                Chưa đúng. Đáp án: <span lang={promptIsJapanese ? 'vi' : 'ja'}>{correctText}</span>
              </span>
            ))}
        </p>
        {answered && (
          <Button ref={nextRef} onClick={onNext} loading={nextLoading} className="ml-auto min-w-32">
            {nextLabel}
            <kbd aria-hidden="true" className="font-sans text-xs font-normal opacity-80">
              Enter
            </kbd>
          </Button>
        )}
      </div>
    </div>
  );
}
