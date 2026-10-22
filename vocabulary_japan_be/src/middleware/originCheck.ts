import type { RequestHandler } from 'express';
import { env } from '../config/env.ts';
import { ApiError } from '../utils/ApiError.ts';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Chống CSRF, bổ sung cho cookie SameSite (prompt mục 6.3): request đổi dữ liệu (POST, PUT,
 * PATCH, DELETE) phải có header Origin khớp CORS_ORIGIN. Không có Origin thì xét Referer.
 * Thiếu cả hai → từ chối: trình duyệt hiện đại luôn gửi Origin với các request này, nên chỉ
 * công cụ ngoài trình duyệt (curl...) bị ảnh hưởng; khi cần thì đặt header Origin thủ công.
 */
export const originCheck: RequestHandler = (req, _res, next) => {
  if (!UNSAFE_METHODS.has(req.method)) return next();
  const origin = originOf(req.get('origin')) ?? originOf(req.get('referer'));
  if (origin !== originOf(env.CORS_ORIGIN)) {
    throw ApiError.forbidden('Yêu cầu không đến từ trang của ứng dụng');
  }
  next();
};
