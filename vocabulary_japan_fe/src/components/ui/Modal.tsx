import { X } from 'lucide-react';
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Nút ở chân modal. */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Không cho đóng bằng Esc hoặc bấm nền (khi đang gửi). */
  dismissible?: boolean;
  /** center: hộp giữa màn hình (điện thoại: trượt từ đáy). sheet: luôn là drawer trượt từ đáy. */
  placement?: 'center' | 'sheet';
  /** Ngôn ngữ của tiêu đề, ví dụ "ja" khi tiêu đề là một từ tiếng Nhật. */
  titleLang?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' };

/**
 * Hộp thoại: giữ focus bên trong (Tab/Shift+Tab xoay vòng), đóng bằng Esc hoặc bấm nền,
 * khóa cuộn trang, trả focus về phần tử đã mở nó khi đóng.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
  placement = 'center',
  titleLang,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const first =
      dialog?.querySelector<HTMLElement>('[data-autofocus]') ??
      dialog?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialog)?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && dismissible) {
      event.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const firstItem = items[0];
    const lastItem = items[items.length - 1];
    if (event.shiftKey && document.activeElement === firstItem) {
      event.preventDefault();
      lastItem?.focus();
    } else if (!event.shiftKey && document.activeElement === lastItem) {
      event.preventDefault();
      firstItem?.focus();
    }
  };

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-end justify-center p-0',
        placement === 'center' && 'sm:items-center sm:p-4',
      )}
      onKeyDown={onKeyDown}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-[page-in_150ms_ease-out] bg-ink/40"
        onClick={() => dismissible && onCloseRef.current()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[90dvh] w-full animate-page-in flex-col border border-rule bg-surface outline-none',
          placement === 'center'
            ? 'rounded-t-[var(--radius-card)] sm:rounded-[var(--radius-card)]'
            : 'max-h-[85dvh] rounded-t-[var(--radius-card)] border-b-0',
          sizes[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
          <div>
            <h2 id={titleId} lang={titleLang} className="text-xl">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={() => onCloseRef.current()}
              aria-label="Đóng"
              className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-ink/5 hover:text-ink"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-rule px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
