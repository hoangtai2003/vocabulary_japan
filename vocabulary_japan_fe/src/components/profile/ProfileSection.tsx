import { useId, type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';

/** Một khối trên trang Hồ sơ: tiêu đề (h2), mô tả ngắn, nội dung. */
export function ProfileSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <Card className={cn('p-4 sm:p-6', className)}>
      <section aria-labelledby={id}>
        <div className="mb-4">
          <h2 id={id} className="text-xl">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        </div>
        {children}
      </section>
    </Card>
  );
}
