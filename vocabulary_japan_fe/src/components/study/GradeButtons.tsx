import type { Quality } from '@/types/api';
import { GRADE_OPTIONS, type GradeKey } from '@/utils/grades';
import { cn } from '@/utils/cn';

const tone: Record<GradeKey, string> = {
  again: 'text-son-ink',
  hard: 'text-ink',
  good: 'text-ink',
  easy: 'text-moss-ink',
};

/** Bốn nút chấm điểm (mục 5.1), mỗi nút ghi phím tắt tương ứng. */
export function GradeButtons({
  onGrade,
  disabled,
}: {
  onGrade: (quality: Quality) => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label="Chấm mức nhớ" className="grid grid-cols-4 gap-2">
      {GRADE_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          disabled={disabled}
          onClick={() => onGrade(option.quality)}
          aria-keyshortcuts={option.hotkeys.join(' ')}
          className={cn(
            'flex h-14 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] border border-rule-strong bg-surface',
            'font-semibold transition-colors hover:border-ink active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55',
            tone[option.key],
          )}
        >
          <span>{option.label}</span>
          <kbd aria-hidden="true" className="font-sans text-[11px] font-normal text-ink-muted">
            {option.hotkeys[0]}
          </kbd>
        </button>
      ))}
    </div>
  );
}
