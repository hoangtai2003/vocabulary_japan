import type { RequestHandler } from 'express';
import { findValidSession, SESSION_COOKIE } from '../modules/auth/sessions.ts';
import { ApiError } from '../utils/ApiError.ts';

/**
 * Đọc cookie `sid`, tìm phiên còn hạn và gắn req.user, req.sessionId.
 * Không có cookie, phiên không tồn tại hoặc hết hạn → 401 UNAUTHORIZED.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || token.length === 0) throw ApiError.unauthorized();
  const session = await findValidSession(token);
  if (!session) throw ApiError.unauthorized('Phiên đăng nhập đã hết hạn. Đăng nhập lại nhé.');
  req.user = session.user;
  req.sessionId = session.id;
  next();
};

/** Đọc người dùng đã được requireAuth gắn; dùng trong route đứng sau requireAuth. */
export function currentUser(req: Express.Request) {
  if (!req.user || !req.sessionId) throw ApiError.unauthorized();
  return { user: req.user, sessionId: req.sessionId };
}
