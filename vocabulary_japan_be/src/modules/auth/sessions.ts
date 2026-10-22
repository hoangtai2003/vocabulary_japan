import { createHash, randomBytes } from 'node:crypto';
import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env.ts';
import { prisma } from '../../db/prisma.ts';

/**
 * Phiên đăng nhập lưu trong database (prompt mục 6.1), không dùng JWT, để đăng xuất, đổi mật khẩu
 * và xóa tài khoản có hiệu lực ngay.
 *
 * - Token: 32 byte ngẫu nhiên (base64url), chỉ nằm trong cookie `sid` của trình duyệt.
 * - Database chỉ lưu SHA-256 của token làm id phiên: lộ database cũng không dùng lại được phiên.
 */
export const SESSION_COOKIE = 'sid';
const DAY_MS = 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, now = new Date()) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + env.SESSION_TTL_DAYS * DAY_MS);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

/** Tìm phiên còn hạn theo token gốc trong cookie; trả về kèm người dùng, hoặc null. */
export async function findValidSession(token: string, now = new Date()) {
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= now) return null;
  return session;
}

export async function deleteSession(sessionId: string) {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

/** Đổi mật khẩu: xóa mọi phiên khác của người dùng, giữ phiên hiện tại. */
export async function deleteOtherSessions(userId: string, keepSessionId: string) {
  await prisma.session.deleteMany({ where: { userId, id: { not: keepSessionId } } });
}

/** Dọn phiên hết hạn (chạy lúc khởi động và mỗi 24 giờ). Trả về số phiên đã xóa. */
export async function deleteExpiredSessions(now = new Date()): Promise<number> {
  const { count } = await prisma.session.deleteMany({ where: { expiresAt: { lte: now } } });
  return count;
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    path: '/',
    sameSite: env.COOKIE_SAME_SITE,
    secure: env.COOKIE_SECURE,
  };
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}
