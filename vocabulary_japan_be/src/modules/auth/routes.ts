import { Router, type RequestHandler } from 'express';
import { currentUser, requireAuth } from '../../middleware/requireAuth.ts';
import { toUserJson } from '../../serializers/user.ts';
import { loginSchema, registerSchema } from './schemas.ts';
import { authenticate, registerUser } from './service.ts';
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  findValidSession,
  SESSION_COOKIE,
  setSessionCookie,
} from './sessions.ts';

/**
 * Xác thực: POST /auth/register, POST /auth/login, POST /auth/logout, GET /auth/me.
 * `authLimiter` (10 lần/15 phút/IP) chỉ gắn cho đăng ký và đăng nhập.
 */
export function createAuthRouter(authLimiter: RequestHandler) {
  const router = Router();

  router.post('/auth/register', authLimiter, async (req, res) => {
    const input = registerSchema.parse(req.body);
    const user = await registerUser(input);
    const { token, expiresAt } = await createSession(user.id);
    setSessionCookie(res, token, expiresAt);
    res.status(201).json({ user: toUserJson(user) });
  });

  router.post('/auth/login', authLimiter, async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await authenticate(input);
    const { token, expiresAt } = await createSession(user.id);
    setSessionCookie(res, token, expiresAt);
    res.json({ user: toUserJson(user) });
  });

  // Đăng xuất luôn trả 204, kể cả khi phiên đã hết hạn: phía client vẫn coi như đã đăng xuất.
  router.post('/auth/logout', async (req, res) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token === 'string' && token) {
      const session = await findValidSession(token);
      if (session) await deleteSession(session.id);
    }
    clearSessionCookie(res);
    res.status(204).end();
  });

  router.get('/auth/me', requireAuth, (req, res) => {
    res.json({ user: toUserJson(currentUser(req).user) });
  });

  return router;
}
