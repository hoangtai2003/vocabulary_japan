import { cn } from '@/utils/cn';

const sizes = {
  sm: 'size-6 text-[11px] border',
  md: 'size-10 text-base border-2',
  lg: 'size-16 text-2xl border-[3px]',
};

/**
 * Con dấu son tròn (hanko) chứa một chữ, hơi nghiêng như đóng tay.
 * `label` là nghĩa đọc cho trình đọc màn hình; bỏ trống thì con dấu chỉ để trang trí.
 */
export function Seal({
  char,
  label,
  size = 'md',
  className,
}: {
  char: string;
  label?: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-flex shrink-0 -rotate-6 items-center justify-center rounded-full border-son font-brush font-semibold leading-none text-son',
        sizes[size],
        className,
      )}
    >
      {char}
    </span>
  );
}
