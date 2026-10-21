import type { JlptLevel } from './word';

export type DailyGoal = 5 | 10 | 20;
export type ThemePreference = 'light' | 'dark' | 'system';
export type UserRole = 'user' | 'admin';

export interface UserSettings {
  /** Số từ mới mỗi ngày */
  daily_goal: DailyGoal;
  /** Cấp độ học từ mới */
  level: JlptLevel;
  theme: ThemePreference;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  settings: UserSettings;
}

export const DAILY_GOALS = [5, 10, 20] as const satisfies readonly DailyGoal[];
export const THEME_PREFERENCES = [
  'light',
  'dark',
  'system',
] as const satisfies readonly ThemePreference[];

export const DEFAULT_SETTINGS: UserSettings = {
  daily_goal: 10,
  level: 'N5',
  theme: 'system',
};
