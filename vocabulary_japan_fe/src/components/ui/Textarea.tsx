import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { useFieldIds, type FieldProps } from './field';
import { FieldShell } from './Input';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, hideLabel, id: idProp, className, ...rest },
  ref,
) {
  const ids = useFieldIds(idProp, { hint, error });
  return (
    <FieldShell {...ids} label={label} hideLabel={hideLabel} hint={hint} error={error}>
      <textarea
        ref={ref}
        id={ids.id}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cn(
          'min-h-28 w-full rounded-[var(--radius-control)] border border-rule-strong bg-surface px-3 py-2 text-base text-ink',
          'placeholder:text-ink-muted/80 focus-visible:border-son aria-[invalid=true]:border-son',
          className,
        )}
        {...rest}
      />
    </FieldShell>
  );
});
