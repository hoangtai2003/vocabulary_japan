import { prisma } from '../../db/prisma.ts';
import type { User } from '../../generated/prisma/client.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { hashPassword, verifyPassword } from '../../utils/password.ts';
import { deleteOtherSessions } from '../auth/sessions.ts';
import type { z } from 'zod';
import type { settingsSchema } from './schemas.ts';

/**
 * Sai mật khẩu hiện tại trả 400 VALIDATION_ERROR kèm fields (API_CONTRACT.md phụ lục B), không
 * trả 401: client hiểu 401 là phiên hết hạn và sẽ đăng xuất người dùng.
 */
async function assertPassword(user: User, password: string, field: string) {
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw ApiError.validation({ [field]: 'Mật khẩu không đúng' });
  }
}

/** PUT /me/settings. Đổi daily_goal hoặc level giữa ngày: /words/today tự tính lại ở lần gọi sau. */
export async function updateSettings(userId: string, input: z.infer<typeof settingsSchema>) {
  return prisma.user.update({
    where: { id: userId },
    data: { dailyGoal: input.daily_goal, level: input.level, theme: input.theme },
  });
}

/** PUT /me/profile */
export async function updateProfile(userId: string, displayName: string) {
  return prisma.user.update({ where: { id: userId }, data: { displayName } });
}

/**
 * PUT /me/password. Đúng mật khẩu hiện tại thì băm mật khẩu mới và xóa mọi phiên khác của người
 * dùng (đăng xuất các thiết bị khác), giữ phiên hiện tại (prompt mục 6.1).
 */
export async function changePassword(user: User, sessionId: string, currentPassword: string, newPassword: string) {
  await assertPassword(user, currentPassword, 'current_password');
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await deleteOtherSessions(user.id, sessionId);
}

/**
 * DELETE /me. Đúng mật khẩu thì xóa người dùng; phiên, trạng thái từ, lịch sử ôn, danh sách
 * hằng ngày và quiz bị xóa theo (onDelete: Cascade trong schema).
 */
export async function deleteAccount(user: User, password: string) {
  await assertPassword(user, password, 'password');
  await prisma.user.delete({ where: { id: user.id } });
}
