import { useId, type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

/** Khung một biểu đồ: tiêu đề, mô tả ngắn, thao tác (ví dụ "Xem dạng bảng"), nội dung. */
export function ChartCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <Card className="p-4 sm:p-5">
      <section aria-labelledby={id}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id={id} className="text-xl">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
          {actions}
        </div>
        {children}
      </section>
    </Card>
  );
}
