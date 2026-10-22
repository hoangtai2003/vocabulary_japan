import { z } from 'zod';
import { paginationSchema } from '../../utils/pagination.ts';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

/** GET /words: level, topic, q, favorite, status, page, page_size. Rỗng = không lọc. */
export const listWordsQuerySchema = paginationSchema.extend({
  level: z
    .enum(['N5', 'N4', 'N3'], { error: 'Cấp độ không hợp lệ' })
    .optional()
    .or(z.literal('').transform(() => undefined)),
  topic: optionalText,
  q: optionalText.pipe(z.string().max(100, 'Từ khóa tối đa 100 ký tự').optional()),
  status: z
    .enum(['new', 'learning', 'review', 'mastered'], { error: 'Trạng thái không hợp lệ' })
    .optional()
    .or(z.literal('').transform(() => undefined)),
  // Hợp đồng: favorite=true (chấp nhận cả 1); giá trị khác coi như không lọc.
  favorite: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
});
export type ListWordsQuery = z.infer<typeof listWordsQuerySchema>;

export const NOTE_MAX_LENGTH = 500;

/** PUT /words/:id/favorite */
export const favoriteSchema = z.object({
  is_favorite: z.boolean({ error: 'Giá trị phải là true hoặc false' }),
});

/** PUT /words/:id/note — tối đa 500 ký tự, chuỗi rỗng là xóa ghi chú. */
export const noteSchema = z.object({
  note: z.string({ error: 'Ghi chú phải là chuỗi' }).max(NOTE_MAX_LENGTH, `Ghi chú tối đa ${NOTE_MAX_LENGTH} ký tự`),
});
