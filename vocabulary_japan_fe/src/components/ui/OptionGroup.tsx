import { cn } from '@/utils/cn';

export interface OptionItem<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

interface OptionGroupProps<T extends string | number> {
  legend: string;
  name: string;
  value: T;
  options: OptionItem<T>[];
  onChange: (value: T) => void;
  error?: string;
  columns?: 2 | 3;
}

/**
 * Nhóm lựa chọn dạng ô (radio thật bên dưới, nên dùng được bằng phím mũi tên).
 * Ô đang chọn có viền mực và ô vuông son nhỏ, như đánh dấu trong vở.
 */
export function OptionGroup<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
  error,
  columns = 3,
}: OptionGroupProps<T>) {
  const errorId = `${name}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className={cn('grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={String(option.value)}
              className={cn(
                'relative flex min-h-12 cursor-pointer flex-col justify-center rounded-[var(--radius-control)] border bg-surface px-3 py-2',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-son',
                checked ? 'border-ink' : 'border-rule-strong hover:border-ink',
              )}
            >
              <input
                type="radio"
                name={name}
                value={String(option.value)}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="flex items-center gap-2 font-semibold">
                <span
                  aria-hidden="true"
                  className={cn('size-2 shrink-0', checked ? 'bg-son' : 'bg-rule')}
                />
                {option.label}
              </span>
              {option.hint && <span className="pl-4 text-xs text-ink-muted">{option.hint}</span>}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-son-ink">
          {error}
        </p>
      )}
    </fieldset>
  );
}
