import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { controlClasses, useFieldIds, type FieldProps } from './field';
import { FieldShell } from './Input';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldProps {
  options: { value: string; label: string }[];
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, hideLabel, id: idProp, options, className, containerClassName, ...rest },
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
      <select
        ref={ref}
        id={ids.id}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cn(controlClasses, 'pr-8', className)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});
