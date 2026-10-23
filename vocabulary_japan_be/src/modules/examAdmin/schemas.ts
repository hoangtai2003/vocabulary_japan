import { z } from 'zod';
import { EXAM_STATUSES } from '../../domain/exam.ts';

/**
 * Schema nội dung đề (SRS 2.0, mục 4.2), dùng chung cho API quản trị và file nhập đề (DR-EX-11).
 * Ở đây chỉ chặn kiểu và độ dài; luật nghiệp vụ (đủ 4 lựa chọn, thứ tự câu ★, cú pháp đánh dấu…)
 * nằm ở domain/exam.ts → validateExam, để bản nháp đang soạn dở vẫn lưu được.
 */

const LEVELS = ['N5', 'N4', 'N3'] as const;

const text = (max: number) => z.string({ error: 'Phải là chuỗi' }).max(max, `Tối đa ${max} ký tự`);
const requiredText = (label: string, max: number) =>
  z
    .string({ error: `Nhập ${label}` })
    .trim()
    .min(1, `Nhập ${label}`)
    .max(max, `Tối đa ${max} ký tự`);
const optionNumber = z.number({ error: 'Phải là số từ 1 đến 4' }).int().min(1).max(4);

/**
 * Schema sửa từng phần (tự lưu, FR-CMS-12): mọi trường đều không bắt buộc và KHÔNG lấy giá trị mặc
 * định. Zod 4 vẫn áp .default() bên trong .partial(), nên phải gỡ default trước khi cho optional,
 * nếu không trường không gửi lên sẽ bị ghi đè bằng giá trị mặc định.
 */
function updateSchema<T extends z.ZodRawShape>(shape: T) {
  const fields = Object.fromEntries(
    Object.entries(shape).map(([key, field]) => [
      key,
      (field instanceof z.ZodDefault ? (field.unwrap() as z.ZodType) : (field as z.ZodType)).optional(),
    ]),
  );
  return z.object(fields) as unknown as z.ZodType<Partial<z.output<z.ZodObject<T>>>>;
}

export const levelSchema = z.enum(LEVELS, { error: 'Cấp độ không hợp lệ' });

export const grammarSchema = z.object({
  pattern: requiredText('mẫu ngữ pháp', 300),
  explanation: text(3000).default(''),
  examples: z.array(text(1000)).max(10, 'Tối đa 10 ví dụ').default([]),
});

export const vocabSchema = z.object({
  word: requiredText('từ', 60),
  reading: text(120).default(''),
  meaning: text(300).default(''),
  word_id: z.string().max(60).nullable().default(null),
});

export const explanationSchema = z.object({
  answer: text(1000).default(''),
  full_sentence: text(3000).default(''),
  translation_vi: text(3000).default(''),
  why_correct: text(6000).default(''),
  why_wrong: text(6000).default(''),
  grammar: z.array(grammarSchema).max(20, 'Tối đa 20 điểm ngữ pháp').default([]),
  vocab: z.array(vocabSchema).max(60, 'Tối đa 60 từ').default([]),
});
export type ExplanationInput = z.infer<typeof explanationSchema>;

export const attachmentSchema = z.object({
  kind: z.enum(['image', 'audio'], { error: 'Loại tệp phải là image hoặc audio' }),
  upload_id: requiredText('mã tệp', 60),
  caption: text(200).default(''),
});

// ---------- Thông tin đề ----------

const examInfoFields = {
  title: requiredText('tên đề', 120),
  level: levelSchema,
  difficulty: z
    .string()
    .trim()
    .max(40, 'Tối đa 40 ký tự')
    .nullable()
    .default(null)
    .transform((v) => (v ? v : null)),
  description: text(3000).default(''),
  instructions: text(3000).default(''),
  source: requiredText('nguồn của đề', 200),
};
export const examInfoSchema = z.object(examInfoFields);
export const examInfoUpdateSchema = updateSchema(examInfoFields);
export type ExamInfoInput = z.infer<typeof examInfoSchema>;

export const statusSchema = z.object({ status: z.enum(EXAM_STATUSES as [string, ...string[]], { error: 'Trạng thái không hợp lệ' }) });

export const adminExamListQuerySchema = z.object({
  level: levelSchema.optional().or(z.literal('').transform(() => undefined)),
  status: z
    .enum(EXAM_STATUSES as [string, ...string[]], { error: 'Trạng thái không hợp lệ' })
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

// ---------- Từng tầng của đề ----------

const sectionFields = {
  title: requiredText('tên phần thi', 80),
  kind: z.enum(['reading', 'listening'], { error: 'Loại phần thi không hợp lệ' }).default('reading'),
  duration_minutes: z.number({ error: 'Thời gian phải là số phút' }).int().min(1).max(300).nullable().default(null),
  score_group: text(80).default(''),
};
export const sectionCreateSchema = z.object({ exam_id: requiredText('đề', 60), ...sectionFields });
export const sectionUpdateSchema = updateSchema(sectionFields);

const mondaiFields = {
  number: z.number({ error: 'Số hiệu mondai phải là số' }).int().min(1).max(99),
  type_id: z.string().max(60).nullable().default(null),
  instructions: text(2000).default(''),
  tip: text(6000).default(''),
};
export const mondaiCreateSchema = z.object({
  section_id: requiredText('phần thi', 60),
  ...mondaiFields,
  // Bỏ trống thì lấy số tiếp theo trong phần thi.
  number: mondaiFields.number.optional(),
});
export const mondaiUpdateSchema = updateSchema(mondaiFields);

const passageFields = {
  label: text(30).default(''),
  intro: text(1000).default(''),
  content: text(30000).default(''),
  content_furigana: text(40000).default(''),
  translation_vi: text(30000).default(''),
  attachments: z.array(attachmentSchema).max(10).default([]),
};
export const passageCreateSchema = z.object({ mondai_id: requiredText('mondai', 60), ...passageFields });
export const passageUpdateSchema = updateSchema(passageFields);

const questionFields = {
  kind: z.enum(['choice', 'star'], { error: 'Kiểu câu phải là choice hoặc star' }),
  number_override: z.number({ error: 'Số câu phải là số' }).int().min(1).max(999).nullable().default(null),
  prompt: text(3000).default(''),
  options: z.array(text(1000)).max(4, 'Tối đa 4 lựa chọn').default([]),
  correct_option: optionNumber.nullable().default(null),
  star_prefix: text(1000).default(''),
  star_suffix: text(1000).default(''),
  star_position: optionNumber.nullable().default(null),
  star_order: z.array(optionNumber).max(4, 'Thứ tự đúng gồm 4 mảnh').default([]),
  explanation: explanationSchema.default({
    answer: '',
    full_sentence: '',
    translation_vi: '',
    why_correct: '',
    why_wrong: '',
    grammar: [],
    vocab: [],
  }),
  learner_note: text(3000).default(''),
  needs_review: z.boolean().default(false),
  internal_note: text(3000).default(''),
  attachments: z.array(attachmentSchema).max(10).default([]),
};
export const questionCreateSchema = z.object({
  mondai_id: requiredText('mondai', 60),
  passage_id: z.string().max(60).nullable().default(null),
  ...questionFields,
  // Bỏ trống thì theo kiểu trả lời của dạng mondai.
  kind: questionFields.kind.optional(),
});
export type QuestionCreateInput = z.infer<typeof questionCreateSchema>;
export const questionUpdateSchema = updateSchema({
  passage_id: z.string().max(60).nullable(),
  ...questionFields,
  // Đổi đáp án đúng của đề đã có lượt làm: phải xác nhận chấm lại (FR-CMS-16).
  confirm_regrade: z.boolean(),
});
export type QuestionUpdateInput = z.infer<typeof questionUpdateSchema>;

/** Thứ tự sau khi kéo thả (FR-CMS-03): cả cây id, cho phép chuyển tầng con sang cha khác cùng đề. */
export const orderSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.string(),
        mondai: z
          .array(
            z.object({
              id: z.string(),
              passages: z.array(z.string()).default([]),
              questions: z.array(z.string()).default([]),
            }),
          )
          .default([]),
      }),
    )
    .max(20),
});
export type OrderInput = z.infer<typeof orderSchema>;

// ---------- Dạng mondai (mục 2.2) ----------

const mondaiTypeFields = {
  level: levelSchema,
  section_title: requiredText('phần thi', 80),
  label_ja: requiredText('tên tiếng Nhật', 80),
  name_vi: requiredText('tên tiếng Việt', 120),
  answer_kind: z.enum(['choice', 'star'], { error: 'Kiểu trả lời phải là choice hoặc star' }),
  has_passage: z.boolean().default(false),
  default_instructions: text(2000).default(''),
  sort_order: z.number().int().min(0).max(999).default(0),
};
export const mondaiTypeCreateSchema = z.object({
  id: z
    .string({ error: 'Nhập mã dạng' })
    .trim()
    .regex(/^[a-z0-9_]{2,40}$/, 'Mã chỉ gồm chữ thường, số và dấu _, 2–40 ký tự'),
  ...mondaiTypeFields,
});
export const mondaiTypeUpdateSchema = updateSchema(mondaiTypeFields);

// ---------- Nhập đề (FR-IMP, DR-EX-11) ----------

export const IMPORT_FORMAT_VERSION = 1;
/** FR-IMP-01: file tối đa 5 MB. */
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export const importBodySchema = z.object({
  content: z.string({ error: 'Chọn file JSON để nhập' }).min(1, 'File trống'),
  dry_run: z.boolean().default(true),
});

const importQuestionSchema = z.object({
  passage: z.string().max(40).nullable().default(null), // key của bài đọc trong cùng mondai
  ...questionFields,
});

const importPassageSchema = z.object({
  key: requiredText('key của bài đọc', 40),
  ...passageFields,
});

const importMondaiSchema = z.object({
  ...mondaiFields,
  passages: z.array(importPassageSchema).max(20).default([]),
  questions: z.array(importQuestionSchema).max(100).default([]),
});

const importSectionSchema = z.object({
  ...sectionFields,
  mondai: z.array(importMondaiSchema).max(20).default([]),
});

export const importFileSchema = z.object({
  format_version: z.literal(IMPORT_FORMAT_VERSION, { error: `format_version phải là ${IMPORT_FORMAT_VERSION}` }),
  exam: examInfoSchema.extend({
    sections: z.array(importSectionSchema).min(1, 'Đề phải có ít nhất một phần thi').max(10),
  }),
});
export type ImportFile = z.infer<typeof importFileSchema>;
