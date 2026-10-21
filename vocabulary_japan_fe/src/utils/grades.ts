import type { Quality } from '@/types/api';

export type GradeKey = 'again' | 'hard' | 'good' | 'easy';

export interface GradeOption {
  key: GradeKey;
  label: string;
  quality: Quality;
  /** Giá trị KeyboardEvent.key kích hoạt nút này */
  hotkeys: string[];
}

/**
 * Bốn nút chấm điểm dùng chung cho mọi phiên học và ôn (mục 5.1).
 * Phím 1–4 theo thứ tự nút; ← là Quên, → là Được.
 */
export const GRADE_OPTIONS: readonly GradeOption[] = [
  { key: 'again', label: 'Quên', quality: 1, hotkeys: ['1', 'ArrowLeft'] },
  { key: 'hard', label: 'Khó', quality: 3, hotkeys: ['2'] },
  { key: 'good', label: 'Được', quality: 4, hotkeys: ['3', 'ArrowRight'] },
  { key: 'easy', label: 'Dễ', quality: 5, hotkeys: ['4'] },
];

export function gradeForKey(key: string): GradeOption | undefined {
  return GRADE_OPTIONS.find((option) => option.hotkeys.includes(key));
}

export function gradeForQuality(quality: Quality): GradeOption | undefined {
  return GRADE_OPTIONS.find((option) => option.quality === quality);
}
