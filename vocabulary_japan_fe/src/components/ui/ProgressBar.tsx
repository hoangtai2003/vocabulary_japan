import { cn } from '@/utils/cn';

export interface ProgressBarProps {
  value: number;
  max: number;
  /** Nhãn cho trình đọc màn hình, ví dụ "Tiến độ hôm nay". */
  label: string;
  /** Text đọc thay giá trị số, ví dụ "3 trên 10 từ". */
  valueText?: string;
  className?: string;
}

/** Quá số ô này thì chuyển sang thanh mảnh, vì ô sẽ quá nhỏ trên điện thoại. */
const MAX_CELLS = 30;

/**
 * Tiến độ dạng hàng ô genkō: mỗi ô là một đơn vị (một từ), ô đã xong được tô son.
 * Khi max > 30 thì dùng thanh mảnh 4px, không bo tròn.
 */
export function ProgressBar({ value, max, label, valueText, className }: ProgressBarProps) {
  const safeMax = Math.max(0, max);
  const clamped = Math.min(Math.max(0, value), safeMax);
  const aria = {
    role: 'progressbar' as const,
    'aria-label': label,
    'aria-valuemin': 0,
    'aria-valuemax': safeMax,
    'aria-valuenow': clamped,
    'aria-valuetext': valueText ?? `${clamped} trên ${safeMax}`,
  };

  if (safeMax > MAX_CELLS || safeMax === 0) {
    const percent = safeMax === 0 ? 0 : (clamped / safeMax) * 100;
    return (
      <div {...aria} className={cn('h-1 w-full bg-rule', className)}>
        <div
          className="h-full bg-son transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  }

  return (
    <div {...aria} className={cn('flex w-full gap-1', className)}>
      {Array.from({ length: safeMax }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="relative aspect-square min-w-0 max-w-8 flex-1 border border-rule bg-surface md:max-w-12"
        >
          {i < clamped && <span className="absolute inset-[3px] animate-cell-fill bg-son" />}
        </span>
      ))}
    </div>
  );
}
