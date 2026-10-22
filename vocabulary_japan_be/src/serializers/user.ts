import type { User } from '../generated/prisma/client.ts';

/** User trong hợp đồng API. Không bao giờ có password_hash. */
export interface UserJson {
  id: string;
  email: string;
  display_name: string;
  role: 'user' | 'admin';
  created_at: string;
  settings: {
    daily_goal: number;
    level: 'N5' | 'N4' | 'N3';
    theme: 'light' | 'dark' | 'system';
  };
}

/** Model Prisma (camelCase) → User của hợp đồng (snake_case). Chọn từng trường, không trả thẳng object Prisma. */
export function toUserJson(user: User): UserJson {
  return {
    id: user.id,
    email: user.email,
    display_name: user.displayName,
    role: user.role,
    created_at: user.createdAt.toISOString(),
    settings: {
      daily_goal: user.dailyGoal,
      level: user.level,
      theme: user.theme,
    },
  };
}
