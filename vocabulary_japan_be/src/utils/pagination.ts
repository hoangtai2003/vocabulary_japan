import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * page bắt đầu từ 1, page_size mặc định 20, tối đa 100 (prompt mục 3.1). Giá trị không hợp lệ
 * thì dùng mặc định, page_size lớn hơn 100 thì lấy 100 (API_CONTRACT.md phụ lục B).
 */
const positiveInt = (fallback: number) =>
  z.preprocess((value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : fallback;
  }, z.number().int().positive());

export const paginationSchema = z.object({
  page: positiveInt(1),
  page_size: positiveInt(DEFAULT_PAGE_SIZE).transform((n) => Math.min(n, MAX_PAGE_SIZE)),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function paginated<T>(items: T[], { page, page_size }: Pagination, total: number) {
  return { items, page, page_size, total };
}

export const skipTake = ({ page, page_size }: Pagination) => ({ skip: (page - 1) * page_size, take: page_size });
