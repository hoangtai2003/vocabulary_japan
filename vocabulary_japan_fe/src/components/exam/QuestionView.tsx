import { Check, X } from 'lucide-react';
import type { LearnerQuestion } from '@/types/exam';
import { cn } from '@/utils/cn';
import { plainText } from '@/utils/markup';
import { Markup } from './Markup';

export interface QuestionViewProps {
  question: LearnerQuestion;
  /** Lựa chọn hiện tại (1–4) */
  selected: number | null;
  /** Bỏ trống: chỉ xem (kết quả, xem trước). */
  onSelect?: (choice: number) => void;
  /** Sau khi chấm: đáp án đúng để tô đúng/sai. */
  correct?: number | null;
  className?: string;
}

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

const optionClass: Record<OptionState, string> = {
  idle: 'border-rule-strong bg-surface hover:border-ink',
  selected: 'border-ink bg-surface ring-1 ring-ink',
  correct: 'border-moss bg-moss-wash',
  wrong: 'border-son bg-son-wash',
  dimmed: 'border-rule bg-surface text-ink-muted',
};

/** Ô số câu như đề in: số trong khung vuông. */
export function QuestionNumber({ number, className }: { number: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 min-w-7 shrink-0 items-center justify-center border border-ink px-1 font-sans text-sm font-semibold tabular-nums',
        className,
      )}
    >
      {number}
    </span>
  );
}

/**
 * Câu ★ (FR-RUN-08): phần đầu câu, 4 ô trống (ô ★ ở đúng vị trí), phần cuối câu — giống đề in.
 * Người học chọn số của mảnh nằm ở ô ★.
 */
export function StarSentence({ question }: { question: LearnerQuestion }) {
  return (
    <p lang="ja" className="exam-text flex flex-wrap items-end gap-x-2 gap-y-1">
      {question.star_prefix && <Markup source={question.star_prefix} inline />}
      {[1, 2, 3, 4].map((slot) => {
        const star = slot === question.star_position;
        return (
          <span
            key={slot}
            role="img"
            aria-label={star ? `ô ${slot}, ô ★` : `ô ${slot}`}
            className="inline-flex h-8 w-14 items-end justify-center border-b-2 border-ink pb-0.5 font-sans text-base sm:w-16"
          >
            {star ? <span className="text-son">★</span> : null}
          </span>
        );
      })}
      {question.star_suffix && <Markup source={question.star_suffix} inline />}
    </p>
  );
}

/** Lựa chọn ngắn (một từ) thì xếp 2 cột như đề in; câu dài thì một cột. */
const isShort = (options: string[]) => options.every((o) => plainText(o).length <= 10);

/**
 * Một câu hỏi: số câu, đề (câu ★ có 4 ô), 4 lựa chọn đánh số 1–4 (FR-RUN-01). Lựa chọn là nhóm
 * radio: chọn bằng chuột, phím 1–4 (trang gắn phím), hoặc Tab rồi Space.
 */
export function QuestionView({ question, selected, onSelect, correct, className }: QuestionViewProps) {
  const graded = correct !== undefined && correct !== null;
  const stateOf = (choice: number): OptionState => {
    if (graded) {
      if (choice === correct) return 'correct';
      if (choice === selected) return 'wrong';
      return 'dimmed';
    }
    return choice === selected ? 'selected' : 'idle';
  };
  const labelId = `q-${question.id}-label`;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div id={labelId} className="flex items-start gap-3">
        <QuestionNumber number={question.number} className="mt-1.5" />
        <span className="sr-only">Câu {question.number}. </span>
        <div className="min-w-0 flex-1">
          {question.kind === 'star' ? (
            <StarSentence question={question} />
          ) : question.prompt ? (
            <Markup source={question.prompt} className="text-lg" />
          ) : (
            <p className="pt-1.5 text-sm text-ink-muted">Chọn từ điền vào chỗ trống số {question.number} của bài đọc.</p>
          )}
        </div>
      </div>

      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-readonly={onSelect ? undefined : true}
        className={cn('grid gap-2', isShort(question.options) && 'sm:grid-cols-2')}
      >
        {question.options.map((option, index) => {
          const choice = index + 1;
          const state = stateOf(choice);
          const checked = choice === selected;
          return (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-keyshortcuts={onSelect ? String(choice) : undefined}
              disabled={!onSelect}
              data-state={state}
              onClick={() => onSelect?.(choice)}
              className={cn(
                'flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2 text-left transition-colors',
                !onSelect && 'cursor-default',
                optionClass[state],
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border font-sans text-sm',
                  state === 'correct'
                    ? 'border-moss bg-moss text-paper'
                    : state === 'wrong'
                      ? 'border-son bg-son text-on-son'
                      : checked
                        ? 'border-ink bg-ink text-paper'
                        : 'border-rule-strong',
                )}
              >
                {choice}
              </span>
              <span className="min-w-0 flex-1">
                <Markup source={option} inline />
              </span>
              {state === 'correct' && <Check aria-hidden="true" className="size-5 shrink-0 text-moss-ink" />}
              {state === 'wrong' && <X aria-hidden="true" className="size-5 shrink-0 text-son-ink" />}
              {state === 'correct' && <span className="sr-only">, đáp án đúng</span>}
              {state === 'wrong' && <span className="sr-only">, bạn chọn, chưa đúng</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
