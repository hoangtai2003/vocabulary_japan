import { X } from 'lucide-react';
import { useToastStore, type ToastTone } from '@/stores/toastStore';
import { cn } from '@/utils/cn';

const toneBar: Record<ToastTone, string> = {
  info: 'border-l-ink',
  success: 'border-l-moss',
  error: 'border-l-son',
};

/**
 * Vùng hiển thị toast. Toast thường dùng role="status" (đọc lịch sự),
 * toast lỗi dùng role="alert" (đọc ngay). Trên điện thoại nằm trên thanh điều hướng dưới.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4',
        'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-auto md:top-4 md:items-end',
      )}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-[var(--radius-control)]',
            'border border-l-[3px] border-rule-strong bg-surface py-3 pl-4 pr-2 text-sm text-ink',
            toneBar[t.tone],
          )}
        >
          <p className="flex-1 pt-0.5">{t.message}</p>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Đóng thông báo"
            className="flex size-7 shrink-0 items-center justify-center rounded text-ink-muted hover:text-ink"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
