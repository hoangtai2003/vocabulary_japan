import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { GenkoMark } from './GenkoMark';

export interface EmptyStateProps {
  title: string;
  /** Câu nói rõ hành động tiếp theo. */
  description?: ReactNode;
  /** Nút hoặc liên kết hành động tiếp theo. */
  action?: ReactNode;
  /** Chữ trong ô genkō; bỏ trống thì không vẽ ô. */
  mark?: string;
  className?: string;
}

export function EmptyState({ title, description, action, mark, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-4 px-4 py-10 text-center', className)}>
      {mark && <GenkoMark char={mark} className="size-20 text-4xl" />}
      <div className="flex max-w-sm flex-col gap-1.5">
        <h2 className="text-xl">{title}</h2>
        {description && <p className="text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
