import { useId } from 'react';

export interface FieldProps {
  label: string;
  /** Lỗi hiển thị dưới trường (role="alert"). */
  error?: string;
  hint?: string;
  /** Ẩn nhãn khỏi màn hình nhưng vẫn đọc được bằng trình đọc màn hình. */
  hideLabel?: boolean;
}

export const controlClasses =
  'h-11 w-full rounded-[var(--radius-control)] border border-rule-strong bg-surface px-3 text-base text-ink ' +
  'placeholder:text-ink-muted/80 transition-colors focus-visible:border-son ' +
  'aria-[invalid=true]:border-son disabled:opacity-60';

/** id cho ô nhập và các đoạn mô tả, cùng giá trị aria-describedby đúng với trạng thái. */
export function useFieldIds(
  idProp: string | undefined,
  { hint, error }: Pick<FieldProps, 'hint' | 'error'>,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return { id, hintId, errorId, describedBy };
}
