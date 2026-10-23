import { z } from 'zod';

const level = z.enum(['N5', 'N4', 'N3'], { error: 'Cấp độ không hợp lệ' });

export const examListQuerySchema = z.object({
  level: level.optional().or(z.literal('').transform(() => undefined)),
});

/**
 * POST /exams/:id/attempts (FR-EXAM-04 đến 06).
 * - exam: thi thử trọn đề, bấm giờ từng phần; phạm vi luôn là cả đề.
 * - section: luyện một phần, bấm giờ theo thời gian chuẩn của phần.
 * - practice: không giới hạn giờ, cả đề, một phần hoặc một mondai.
 */
export const startAttemptSchema = z
  .object({
    mode: z.enum(['exam', 'section', 'practice'], { error: 'Chế độ không hợp lệ' }),
    scope: z.discriminatedUnion(
      'type',
      [
        z.object({ type: z.literal('exam') }),
        z.object({ type: z.literal('section'), id: z.string().min(1) }),
        z.object({ type: z.literal('mondai'), id: z.string().min(1) }),
      ],
      { error: 'Phạm vi không hợp lệ' },
    ),
    /** Còn lượt đang làm dở của đề này: true = bỏ lượt cũ (FR-RUN-05). */
    discard_in_progress: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'exam' && value.scope.type !== 'exam') {
      ctx.addIssue({ code: 'custom', path: ['scope'], message: 'Thi thử luôn làm cả đề' });
    }
    if (value.mode === 'section' && value.scope.type !== 'section') {
      ctx.addIssue({ code: 'custom', path: ['scope'], message: 'Luyện một phần cần chọn một phần thi' });
    }
  });
export type StartAttemptInput = z.infer<typeof startAttemptSchema>;

export const answerSchema = z.object({
  choice: z.number({ error: 'Đáp án phải là số từ 1 đến 4' }).int().min(1).max(4).nullable().optional(),
  flagged: z.boolean().optional(),
  /** Tổng thời gian ở câu này (ms); server giữ giá trị lớn nhất đã nhận. */
  time_spent_ms: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
  /** Thời điểm đổi trên trình duyệt: bản gửi lại (mất mạng) cũ hơn bản đã lưu thì bị bỏ qua. */
  changed_at: z.iso.datetime({ offset: true }).optional(),
});
export type AnswerInput = z.infer<typeof answerSchema>;

export const positionSchema = z.object({ question_id: z.string().min(1, 'Thiếu câu hỏi') });

export const byTypeSchema = z.object({
  level,
  mondai_type: z.string({ error: 'Chọn dạng mondai' }).min(1, 'Chọn dạng mondai'),
  count: z.number({ error: 'Số câu phải là số' }).int().min(1).max(50).default(10),
});

export const wrongReviewSchema = z.object({
  level: level.optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const fromExplanationSchema = z.object({ word_id: z.string({ error: 'Thiếu từ' }).min(1, 'Thiếu từ') });
