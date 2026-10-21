import { cn } from '@/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold ' +
  'select-none whitespace-nowrap transition-[background-color,color,transform] duration-150 ' +
  'active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-son text-on-son hover:bg-son-ink dark:hover:bg-son/90',
  secondary: 'border border-rule-strong bg-surface text-ink hover:bg-paper',
  ghost: 'text-ink hover:bg-ink/5',
  danger: 'border border-son bg-surface text-son-ink hover:bg-son-wash',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-[15px]',
  lg: 'h-12 px-6 text-base',
};

/** Class của nút, dùng chung cho <Button> và <Link> trông như nút. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
} = {}): string {
  return cn(base, variants[variant], sizes[size], block && 'w-full', className);
}
