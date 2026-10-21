import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from '@/api/client';

/**
 * Đưa lỗi từ API vào form:
 * - `fields` của API (VALIDATION_ERROR, EMAIL_TAKEN...) hiển thị dưới đúng trường, nếu trường
 *   đó có trong form;
 * - còn lại trả về một thông báo chung để hiển thị ở đầu form.
 * Trả về null khi mọi lỗi đã được gắn vào trường.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
): string | null {
  if (!isApiError(error)) return 'Đã có lỗi xảy ra. Thử lại nhé.';

  let unmatched = false;
  if (error.fields) {
    for (const [field, message] of Object.entries(error.fields)) {
      if ((knownFields as readonly string[]).includes(field)) {
        setError(field as Path<T>, { type: 'server', message });
      } else {
        unmatched = true;
      }
    }
    if (!unmatched) return null;
  }
  return error.message;
}
