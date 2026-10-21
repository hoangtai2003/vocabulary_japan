import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Nhập email')
  .toLowerCase()
  .pipe(z.email('Email không hợp lệ'));

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Tên hiển thị cần ít nhất 2 ký tự')
  .max(40, 'Tên hiển thị tối đa 40 ký tự');

export const newPasswordSchema = z
  .string()
  .min(6, 'Mật khẩu cần ít nhất 6 ký tự')
  .max(100, 'Mật khẩu tối đa 100 ký tự');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Nhập mật khẩu'),
});
export type LoginFormValues = z.input<typeof loginSchema>;

/** Body của POST /auth/register (server dùng). */
export const registerRequestSchema = z.object({
  display_name: displayNameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

/** Form đăng ký: thêm ô nhập lại mật khẩu. */
export const registerFormSchema = registerRequestSchema
  .extend({ confirm_password: z.string().min(1, 'Nhập lại mật khẩu một lần nữa để xác nhận') })
  .refine((v) => v.password === v.confirm_password, {
    path: ['confirm_password'],
    message: 'Mật khẩu nhập lại không khớp',
  });
export type RegisterFormValues = z.input<typeof registerFormSchema>;
