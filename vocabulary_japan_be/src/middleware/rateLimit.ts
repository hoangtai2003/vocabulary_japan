import { rateLimit } from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.ts';

const WINDOW_MS = 15 * 60 * 1000;

const tooMany = () =>
  new ApiError(429, 'RATE_LIMITED', 'Bạn thao tác quá nhanh. Đợi vài phút rồi thử lại nhé.');

/**
 * Giới hạn tần suất theo IP (prompt mục 6.3). IP lấy từ req.ip, đúng IP người dùng khi chạy sau
 * Nginx nhờ `trust proxy`. Mỗi lần gọi tạo một bộ đếm mới (trong bộ nhớ), nên mỗi app trong test
 * có bộ đếm riêng. Vượt giới hạn → 429 RATE_LIMITED qua error handler chung.
 */
export function createRateLimiters() {
  const common = {
    windowMs: WINDOW_MS,
    standardHeaders: 'draft-8' as const,
    legacyHeaders: false,
    handler: () => {
      throw tooMany();
    },
  };
  return {
    /** /auth/login và /auth/register: 10 lần mỗi 15 phút. */
    auth: rateLimit({ ...common, limit: 10 }),
    /** Mọi API khác: 300 lần mỗi 15 phút. */
    api: rateLimit({ ...common, limit: 300 }),
  };
}
