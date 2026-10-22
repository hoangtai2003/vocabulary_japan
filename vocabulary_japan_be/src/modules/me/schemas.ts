import { z } from 'zod';
import { displayNameSchema, newPasswordSchema } from '../auth/schemas.ts';
import { PASSWORD_MAX } from '../../utils/password.ts';

/**
 * PUT /me/settings — Partial<UserSettings>. Trường lạ bị từ chối (strict), giống mock frontend.
 * Body rỗng {} hợp lệ: không đổi gì, trả về user hiện tại.
 */
export const settingsSchema = z
  .object({
    daily_goal: z.union([z.literal(5), z.literal(10), z.literal(20)], { error: 'Số từ mỗi ngày là 5, 10 hoặc 20' }),
    level: z.enum(['N5', 'N4', 'N3'], { error: 'Cấp độ không hợp lệ' }),
    theme: z.enum(['light', 'dark', 'system'], { error: 'Giao diện không hợp lệ' }),
  })
  .partial()
  .strict();

/** PUT /me/profile */
export const profileSchema = z.object({ display_name: displayNameSchema });

/** PUT /me/password */
export const passwordChangeSchema = z.object({
  current_password: z.string({ error: 'Nhập mật khẩu hiện tại' }).min(1, 'Nhập mật khẩu hiện tại').max(PASSWORD_MAX),
  new_password: newPasswordSchema,
});

/** DELETE /me */
export const deleteAccountSchema = z.object({
  password: z.string({ error: 'Nhập mật khẩu' }).min(1, 'Nhập mật khẩu').max(PASSWORD_MAX),
});
