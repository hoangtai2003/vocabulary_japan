import { cn } from '@/utils/cn';

/** Một ô genkō lớn chứa một chữ, dùng cho trang 404/403 và trạng thái rỗng. */
export function GenkoMark({ char, className }: { char: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'genko-cell flex size-28 items-center justify-center rounded-[4px] font-brush text-6xl text-ink',
        className,
      )}
    >
      <span className="relative">{char}</span>
    </div>
  );
}
