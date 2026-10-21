import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Khối giữ chỗ khi đang tải. Đặt kích thước bằng className để đúng hình nội dung. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('animate-pulse rounded-[4px] bg-rule/70', className)} />
  );
}

/** Bọc một nhóm skeleton, báo cho trình đọc màn hình là đang tải. */
export function SkeletonGroup({
  label = 'Đang tải',
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className={className}>
      {children}
    </div>
  );
}
