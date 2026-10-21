import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { controlClasses, useFieldIds, type FieldProps } from './field';
import { FieldShell } from './Input';

export type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & FieldProps;

/** Ô mật khẩu có nút hiện/ẩn. */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label, error, hint, hideLabel, id: idProp, className, ...rest }, ref) {
    const [visible, setVisible] = useState(false);
    const ids = useFieldIds(idProp, { hint, error });
    return (
      <FieldShell {...ids} label={label} hideLabel={hideLabel} hint={hint} error={error}>
        <div className="relative">
          <input
            ref={ref}
            id={ids.id}
            type={visible ? 'text' : 'password'}
            aria-invalid={error ? true : undefined}
            aria-describedby={ids.describedBy}
            className={cn(controlClasses, 'pr-12', className)}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={visible}
            className="absolute inset-y-1 right-1 flex w-10 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:text-ink"
          >
            {visible ? (
              <EyeOff aria-hidden="true" className="size-5" />
            ) : (
              <Eye aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </FieldShell>
    );
  },
);
