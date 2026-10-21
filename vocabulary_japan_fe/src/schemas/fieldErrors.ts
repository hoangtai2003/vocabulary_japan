import type { z } from 'zod';

/**
 * Đổi lỗi zod thành dạng `fields` của API: { tên_trường: thông_báo }.
 * Lấy thông báo đầu tiên của mỗi trường; đường dẫn lồng nhau nối bằng dấu chấm (meanings_vi.0).
 */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.map(String).join('.') : '_';
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}
