import { cn } from '@/utils/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/** Trạng thái lỗi của một trang hoặc khối: nói chuyện gì xảy ra và cho thử lại. */
export function ErrorState({
  title = 'Chưa tải được dữ liệu',
  message = 'Kiểm tra kết nối mạng rồi thử lại.',
  onRetry,
  retrying,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-son/40 border-l-[3px] border-l-son bg-son-wash/50 p-4',
        className,
      )}
    >
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-ink-muted">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
