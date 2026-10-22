import { z } from 'zod';

export const DEFAULT_DUE_LIMIT = 50;
export const MAX_DUE_LIMIT = 500;

/** GET /reviews/due?limit — mặc định 50, tối đa 500; giá trị sai dùng mặc định (giống mock). */
export const dueQuerySchema = z.object({
  limit: z.preprocess((value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? Math.min(n, MAX_DUE_LIMIT) : DEFAULT_DUE_LIMIT;
  }, z.number().int().positive()),
});

/** POST /reviews/:wordId — quality là số nguyên 0–5 (giao diện chỉ gửi 1, 3, 4, 5). */
export const gradeSchema = z.object({
  quality: z
    .number({ error: 'quality phải là số nguyên từ 0 đến 5' })
    .int('quality phải là số nguyên từ 0 đến 5')
    .min(0, 'quality phải là số nguyên từ 0 đến 5')
    .max(5, 'quality phải là số nguyên từ 0 đến 5')
    .transform((q) => q as 0 | 1 | 2 | 3 | 4 | 5),
});
