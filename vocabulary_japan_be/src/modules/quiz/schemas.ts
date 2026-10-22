import { z } from 'zod';

/** POST /quiz/start — thông báo lỗi giống mock frontend. */
export const startQuizSchema = z.object({
  mode: z.enum(['jp_vi', 'vi_jp'], { error: 'Chọn chế độ Nhật → Việt hoặc Việt → Nhật' }),
  level: z.enum(['N5', 'N4', 'N3'], { error: 'Cấp độ không hợp lệ' }),
  count: z.union([z.literal(10), z.literal(20), z.literal(30)], { error: 'Số câu là 10, 20 hoặc 30' }),
});
export type StartQuizInput = z.infer<typeof startQuizSchema>;

/** POST /quiz/submit — câu không có trong answers được tính là sai. */
export const submitQuizSchema = z.object({
  quiz_id: z.string({ error: 'Thiếu quiz_id' }).min(1, 'Thiếu quiz_id').max(100),
  answers: z
    .array(
      z.object({
        question_id: z.string().max(200),
        option_id: z.string().max(200),
      }),
      { error: 'answers phải là mảng' },
    )
    .max(100, 'Tối đa 100 câu trả lời'),
});
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;
