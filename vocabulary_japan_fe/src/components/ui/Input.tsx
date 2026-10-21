import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { controlClasses, useFieldIds, type FieldProps } from './field';

interface FieldShellProps extends FieldProps {
  id: string;
  hintId: string;
  errorId: string;
  children: ReactNode;
  className?: string;
}

/** Khung chung: nhãn, ô nhập, gợi ý, lỗi. Dùng cho Input, PasswordInput, Select, Textarea. */
export function FieldShell({
  id,
  label,
  hideLabel,
  hint,
  hintId,
  error,
  errorId,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-sm font-medium text-ink', hideLabel && 'sr-only')}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-son-ink">
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldProps {
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, hideLabel, id: idProp, className, containerClassName, ...rest },
  ref,
) {
  const ids = useFieldIds(idProp, { hint, error });
  return (
    <FieldShell
      {...ids}
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      className={containerClassName}
    >
      <input
        ref={ref}
        id={ids.id}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cn(controlClasses, className)}
        {...rest}
      />
    </FieldShell>
  );
});
