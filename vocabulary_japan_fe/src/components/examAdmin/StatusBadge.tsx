import type { ExamStatus } from '@/types/exam';
import { cn } from '@/utils/cn';
import { STATUS_LABELS } from '@/utils/examFormat';

const tones: Record<ExamStatus, string> = {
  draft: 'border-rule-strong text-ink-muted',
  pending_review: 'border-ink text-ink',
  published: 'border-moss bg-moss-wash text-moss-ink',
  hidden: 'border-rule-strong bg-paper text-ink-muted',
};

/** Trạng thái của đề (FR-CMS-13). */
export function StatusBadge({ status, className }: { status: ExamStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center border px-1.5 text-xs font-semibold', tones[status], className)}>
      {STATUS_LABELS[status]}
    </span>
  );
}
