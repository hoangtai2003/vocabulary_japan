import { z } from 'zod';

export const DEFAULT_WEEKS = 8;
export const MAX_WEEKS = 52;
/** Khoảng ngày tối đa của /stats/calendar, tính cả hai đầu (prompt backend mục 5.4). */
export const MAX_CALENDAR_DAYS = 366;

/** GET /stats/weekly?weeks — mặc định 8, tối đa 52; giá trị sai dùng mặc định (giống mock). */
export const weeklyQuerySchema = z.object({
  weeks: z.preprocess((value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? Math.min(n, MAX_WEEKS) : DEFAULT_WEEKS;
  }, z.number().int().positive()),
});

/** GET /stats/calendar?from&to — kiểm tra ngày thật (2026-02-30 sai) ở service, vì cần múi giờ. */
export const calendarQuerySchema = z.object({
  from: z.string().optional().default(''),
  to: z.string().optional().default(''),
});
