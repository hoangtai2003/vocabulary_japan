import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

/** Thẻ giấy: nền surface, viền kẻ ô, không bóng. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-[var(--radius-card)] border border-rule bg-surface', className)}
      {...rest}
    />
  );
}
