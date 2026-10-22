import type { z } from 'zod';

/**
 * Đổi lỗi zod thành `fields` của API: { tên_trường: thông_báo }, giống frontend
 * (src/schemas/fieldErrors.ts). Lấy thông báo đầu tiên mỗi trường; đường dẫn lồng nhau nối bằng
 * dấu chấm (meanings_vi.0). Lỗi không gắn trường nào có khóa "_".
 */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.map(String).join('.') : '_';
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}
