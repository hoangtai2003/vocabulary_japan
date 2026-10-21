import { WORD_STATUS_LABELS, type WordStatus } from '@/types/word';
import { cn } from '@/utils/cn';

const marker: Record<WordStatus, string> = {
  new: 'border border-rule-strong',
  learning: 'bg-ink-muted',
  review: 'bg-ink',
  mastered: 'bg-moss',
};

/** Trạng thái học của từ: ô vuông nhỏ (tô dần theo mức thuộc) kèm nhãn. */
export function StatusLabel({ status, className }: { status: WordStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        status === 'mastered' && 'text-moss-ink',
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-2 shrink-0', marker[status])} />
      {WORD_STATUS_LABELS[status]}
    </span>
  );
}
