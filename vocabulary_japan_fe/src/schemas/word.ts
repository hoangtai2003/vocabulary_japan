import { z } from 'zod';
import { JLPT_LEVELS, WORD_TYPES, type WordInput } from '@/types/word';

const KANA_RE = /^[぀-ゟ゠-ヿ〜～・\s]+$/u;
const ROMAJI_RE = /^[a-z][a-z\s'-]*$/;

const requiredText = (label: string, max: number) =>
  z
    .string({ error: `Nhập ${label}` })
    .trim()
    .min(1, `Nhập ${label}`)
    .max(max, `${label[0]?.toUpperCase()}${label.slice(1)} tối đa ${max} ký tự`);

/**
 * Schema của một từ khi tạo/sửa (Word không có id). Dùng chung cho form ở trang Quản trị,
 * cho handler mock và cho kiểm tra file import.
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
    .array(
      z.string().trim().min(1, 'Nghĩa không được để trống').max(100, 'Mỗi nghĩa tối đa 100 ký tự'),
      {
        error: 'Nhập ít nhất một nghĩa',
      },
    )
    .min(1, 'Nhập ít nhất một nghĩa')
    .max(10, 'Tối đa 10 nghĩa'),
  type: z.enum(WORD_TYPES, { error: 'Loại từ không hợp lệ' }),
  level: z.enum(JLPT_LEVELS, { error: 'Cấp độ không hợp lệ' }),
  topic_id: requiredText('chủ đề', 40),
  example_jp: requiredText('câu ví dụ', 200),
  example_kana: requiredText('câu ví dụ bằng kana', 200),
  example_romaji: requiredText('câu ví dụ bằng romaji', 300),
  example_vi: requiredText('nghĩa câu ví dụ', 300),
});

/**
 * Form thêm/sửa từ ở trang Quản trị. Khác wordInputSchema duy nhất ở cách nhập nghĩa: một ô
 * nhiều dòng, mỗi dòng một nghĩa (dòng trống bị bỏ), rồi kiểm tra bằng đúng luật meanings_vi
 * của wordInputSchema. Đầu ra vẫn là WordInput.
 */
export const wordFormSchema = wordInputSchema.extend({
  meanings_vi: z
    .string()
    .transform((value) =>
      value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .pipe(wordInputSchema.shape.meanings_vi),
});

export type WordFormValues = z.input<typeof wordFormSchema>;

// Bảo đảm schema luôn khớp kiểu WordInput: nếu kiểu Word đổi mà schema chưa đổi, typecheck báo lỗi.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _schemaMatchesWordInput: Exact<z.output<typeof wordInputSchema>, WordInput> = true;
void _schemaMatchesWordInput;
const _formMatchesWordInput: Exact<z.output<typeof wordFormSchema>, WordInput> = true;
void _formMatchesWordInput;
