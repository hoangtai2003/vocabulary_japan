import { z } from 'zod';
import { PASSWORD_MAX, PASSWORD_MIN } from '../../utils/password.ts';

/** Email: bỏ khoảng trắng, chữ thường, rồi kiểm tra định dạng (giống frontend src/schemas/auth.ts). */
export const emailSchema = z
  .string({ error: 'Nhập email' })
  .trim()
  .min(1, 'Nhập email')
  .max(254, 'Email quá dài')
  .toLowerCase()
  .pipe(z.email('Email không hợp lệ'));

export const newPasswordSchema = z
  .string({ error: 'Nhập mật khẩu' })
  .min(PASSWORD_MIN, `Mật khẩu cần ít nhất ${PASSWORD_MIN} ký tự`)
  .max(PASSWORD_MAX, `Mật khẩu tối đa ${PASSWORD_MAX} ký tự`);

export const displayNameSchema = z
  .string({ error: 'Nhập tên hiển thị' })
  .trim()
  .min(2, 'Tên hiển thị cần ít nhất 2 ký tự')
  .max(40, 'Tên hiển thị tối đa 40 ký tự');

/** POST /auth/register */
export const registerSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  display_name: displayNameSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** POST /auth/login. Mật khẩu chỉ cần có (không lộ quy tắc độ dài khi đăng nhập), tối đa 128 để chặn body quá lớn. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'Nhập mật khẩu' }).min(1, 'Nhập mật khẩu').max(PASSWORD_MAX, 'Mật khẩu không đúng'),
});
export type LoginInput = z.infer<typeof loginSchema>;
