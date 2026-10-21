import { z } from 'zod';
import { DAILY_GOALS, THEME_PREFERENCES } from '@/types/user';
import { JLPT_LEVELS } from '@/types/word';
import { displayNameSchema, newPasswordSchema } from './auth';

export const NOTE_MAX_LENGTH = 500;

export const settingsUpdateSchema = z
  .object({
    daily_goal: z.union(
      DAILY_GOALS.map((goal) => z.literal(goal)),
      { error: 'Số từ mỗi ngày là 5, 10 hoặc 20' },
    ),
    level: z.enum(JLPT_LEVELS, { error: 'Cấp độ không hợp lệ' }),
    theme: z.enum(THEME_PREFERENCES, { error: 'Giao diện không hợp lệ' }),
  })
  .partial()
  .strict();

export const profileUpdateSchema = z.object({ display_name: displayNameSchema });

export const passwordChangeRequestSchema = z.object({
  current_password: z.string().min(1, 'Nhập mật khẩu hiện tại'),
  new_password: newPasswordSchema,
});

export const passwordChangeFormSchema = passwordChangeRequestSchema
  .extend({ confirm_password: z.string().min(1, 'Nhập lại mật khẩu mới') })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ['confirm_password'],
    message: 'Mật khẩu nhập lại không khớp',
  });
export type PasswordChangeFormValues = z.input<typeof passwordChangeFormSchema>;

export const noteSchema = z.object({
  note: z.string().max(NOTE_MAX_LENGTH, `Ghi chú tối đa ${NOTE_MAX_LENGTH} ký tự`),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Nhập mật khẩu'),
});
