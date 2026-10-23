import { CloudOff, LayoutGrid, LogOut } from 'lucide-react';
import { spokenClock, formatClock } from '@/hooks/useCountdown';
import type { SaveStatus } from '@/hooks/useExamRunner';
import { cn } from '@/utils/cn';

/** Còn 5 phút thì đồng hồ đổi màu (FR-RUN-02). */
export const WARNING_MS = 5 * 60_000;

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: 'Đã lưu',
  saving: 'Đang lưu…',
  unsaved: 'Chưa lưu',
};

export function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium',
        status === 'unsaved' ? 'text-son-ink' : 'text-ink-muted',
      )}
    >
      {status === 'unsaved' && <CloudOff aria-hidden="true" className="size-4" />}
      {STATUS_TEXT[status]}
      {status === 'unsaved' && <span className="sr-only">, sẽ gửi lại khi có mạng</span>}
    </span>
  );
}

export function ExamClock({ remaining }: { remaining: number }) {
  const warning = remaining <= WARNING_MS;
  return (
    <span
      role="timer"
      aria-label={`Thời gian còn lại ${spokenClock(remaining)}`}
      className={cn(
        'inline-flex min-w-[4.5rem] items-center justify-center rounded-[var(--radius-control)] border px-2 py-1 font-sans text-lg font-semibold tabular-nums',
        warning ? 'border-son bg-son text-on-son' : 'border-rule-strong text-ink',
      )}
    >
      {formatClock(remaining)}
    </span>
  );
}

/**
 * Thanh trên cùng cố định của màn hình làm bài (mục 5.1): tên phần thi, đồng hồ, trạng thái
 * lưu, nút mở bảng câu hỏi, và nút thoát (bài đã lưu, quay lại làm tiếp được).
 */
export function RunTopBar({
  title,
  subtitle,
  remaining,
  status,
  onOpenNav,
  onExit,
  progress,
}: {
  title: string;
  subtitle?: string;
  remaining: number | null;
  status: SaveStatus;
  onOpenNav?: () => void;
  onExit: () => void;
  progress?: string;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-rule bg-paper px-2 sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onExit}
        aria-label="Thoát (bài đã lưu, làm tiếp sau được)"
        className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-ink/5 hover:text-ink"
      >
        <LogOut aria-hidden="true" className="size-5 -scale-x-100" />
      </button>
      <div className="min-w-0 flex-1">
        <p lang="ja" className="truncate font-jp text-[15px] font-medium leading-tight">
          {title}
        </p>
        <div className="flex items-center gap-2">
          {subtitle && <p className="truncate text-xs text-ink-muted">{subtitle}</p>}
          <SaveIndicator status={status} />
        </div>
      </div>
      {remaining !== null && <ExamClock remaining={remaining} />}
      {onOpenNav && (
        <button
          type="button"
          onClick={onOpenNav}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[var(--radius-control)] border border-rule-strong px-2.5 text-sm font-medium hover:border-ink"
        >
          <LayoutGrid aria-hidden="true" className="size-4" />
          <span className="hidden tabular-nums sm:inline">{progress}</span>
          <span className="sr-only">Mở bảng câu hỏi</span>
        </button>
      )}
    </header>
  );
}
