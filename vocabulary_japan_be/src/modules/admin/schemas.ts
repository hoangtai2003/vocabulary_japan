import { z } from 'zod';
import { paginationSchema } from '../../utils/pagination.ts';

const WORD_TYPES = [
  'noun',
  'pronoun',
  'verb_godan',
  'verb_ichidan',
  'verb_irregular',
  'adj_i',
  'adj_na',
  'adverb',
  'particle',
  'counter',
  'expression',
  'other',
] as const;

/** Hiragana (U+3040–309F), katakana (U+30A0–30FF), 〜 ～ ・ và khoảng trắng. */
const KANA_RE = /^[぀-ゟ゠-ヿ〜～・\s]+$/u;
const ROMAJI_RE = /^[a-z][a-z\s'-]*$/;

const requiredText = (label: string, max: number) =>
  z
    .string({ error: `Nhập ${label}` })
    .trim()
    .min(1, `Nhập ${label}`)
    .max(max, `${label[0]?.toUpperCase()}${label.slice(1)} tối đa ${max} ký tự`);

/**
 * Một từ khi thêm/sửa (Word không có id) — prompt mục 7: thêm và sửa dùng chung schema này.
 * Chép đúng luật và thông báo của frontend (src/schemas/word.ts, wordInputSchema), để form
 * Quản trị và backend báo cùng một lỗi.
 */
export const wordInputSchema = z.object({
  kanji: z
    .string()
    .trim()
    .max(20, 'Kanji tối đa 20 ký tự')
    .nullable()
    .transform((value) => (value ? value : null)),
  kana: requiredText('cách đọc', 40).regex(KANA_RE, 'Cách đọc chỉ gồm hiragana hoặc katakana'),
  romaji: requiredText('romaji', 60)
    .transform((value) => value.toLowerCase())
    .pipe(z.string().regex(ROMAJI_RE, 'Romaji chỉ gồm chữ cái Latin không dấu')),
  meanings_vi: z
    .array(z.string().trim().min(1, 'Nghĩa không được để trống').max(100, 'Mỗi nghĩa tối đa 100 ký tự'), {
      error: 'Nhập ít nhất một nghĩa',
    })
    .min(1, 'Nhập ít nhất một nghĩa')
    .max(10, 'Tối đa 10 nghĩa'),
  type: z.enum(WORD_TYPES, { error: 'Loại từ không hợp lệ' }),
  level: z.enum(['N5', 'N4', 'N3'], { error: 'Cấp độ không hợp lệ' }),
  topic_id: requiredText('chủ đề', 40),
  example_jp: requiredText('câu ví dụ', 200),
  example_kana: requiredText('câu ví dụ bằng kana', 200),
  example_romaji: requiredText('câu ví dụ bằng romaji', 300),
  example_vi: requiredText('nghĩa câu ví dụ', 300),
});
export type WordInput = z.infer<typeof wordInputSchema>;

export const SORT_FIELDS = ['id', 'kanji', 'kana', 'romaji', 'level', 'type', 'topic_id'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

/**
 * GET /admin/words: q, level, topic, page, page_size, và phần mở rộng sort, order
 * (API_CONTRACT.md phụ lục A.2). sort/order sai thì dùng mặc định (id, asc); level sai → 400.
 */
export const adminListQuerySchema = paginationSchema.extend({
  q: z
    .string()
    .trim()
    .max(100, 'Từ khóa tối đa 100 ký tự')
    .optional()
    .transform((v) => (v ? v : undefined)),
  level: z
    .enum(['N5', 'N4', 'N3'], { error: 'Cấp độ không hợp lệ' })
    .optional()
    .or(z.literal('').transform(() => undefined)),
  topic: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  sort: z.preprocess((v) => ((SORT_FIELDS as readonly unknown[]).includes(v) ? v : 'id'), z.enum(SORT_FIELDS)),
  order: z.preprocess((v) => (v === 'desc' ? 'desc' : 'asc'), z.enum(['asc', 'desc'])),
});
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
