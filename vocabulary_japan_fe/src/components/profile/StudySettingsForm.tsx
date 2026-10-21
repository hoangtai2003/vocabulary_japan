import { useState } from 'react';
import { OptionGroup } from '@/components/ui/OptionGroup';
import { useUpdateSettings } from '@/hooks/queries/useAccount';
import { useThemeStore } from '@/stores/themeStore';
import { toast } from '@/stores/toastStore';
import { DAILY_GOALS, type DailyGoal, type ThemePreference, type UserSettings } from '@/types/user';
import { JLPT_LEVELS, type JlptLevel } from '@/types/word';

const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Sáng',
  dark: 'Tối',
  system: 'Theo hệ thống',
};

function successMessage<K extends keyof UserSettings>(key: K, value: UserSettings[K]): string {
  if (key === 'daily_goal') return `Đã đặt mục tiêu ${value} từ mới mỗi ngày.`;
  if (key === 'level') return `Đã chuyển sang học từ ${value}.`;
  return `Đã đổi giao diện: ${THEME_LABELS[value as ThemePreference]}.`;
}

/**
 * Số từ mỗi ngày, cấp độ, giao diện. Lưu ngay khi đổi (PUT /me/settings) kèm toast.
 * Lựa chọn hiện ngay (giá trị tạm trong `draft`); lỗi thì quay về giá trị trên server.
 * Giao diện được áp ngay lập tức, không chờ server.
 */
export function StudySettingsForm({ settings }: { settings: UserSettings }) {
  const updateSettings = useUpdateSettings();
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const [draft, setDraft] = useState<Partial<UserSettings>>({});
  const value: UserSettings = { ...settings, ...draft };

  const change = async <K extends keyof UserSettings>(key: K, next: UserSettings[K]) => {
    if (value[key] === next) return;
    const previous = value[key];
    setDraft((d) => ({ ...d, [key]: next }));
    if (key === 'theme') setThemePreference(next as ThemePreference);
    try {
      // mutateAsync thay vì mutate: mỗi lần đổi có try/catch riêng, kể cả khi bấm liên tiếp.
      await updateSettings.mutateAsync({ [key]: next });
      toast.success(successMessage(key, next));
    } catch {
      if (key === 'theme') setThemePreference(previous as ThemePreference);
      toast.error('Chưa lưu được cài đặt. Kiểm tra mạng rồi chọn lại.');
    } finally {
      // Thành công: user trong cache đã có giá trị mới. Lỗi: quay về giá trị của server.
      setDraft((d) => {
        if (d[key] !== next) return d;
        const rest = { ...d };
        delete rest[key];
        return rest;
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <OptionGroup<DailyGoal>
        legend="Số từ mới mỗi ngày"
        name="daily_goal"
        value={value.daily_goal}
        onChange={(goal) => void change('daily_goal', goal)}
        options={DAILY_GOALS.map((goal) => ({
          value: goal,
          label: `${goal} từ`,
          hint: goal === 5 ? 'Nhẹ nhàng' : goal === 10 ? 'Đều đặn' : 'Tăng tốc',
        }))}
      />
      <OptionGroup<JlptLevel>
        legend="Cấp độ học từ mới"
        name="level"
        value={value.level}
        onChange={(level) => void change('level', level)}
        options={JLPT_LEVELS.map((level) => ({ value: level, label: level }))}
      />
      <OptionGroup<ThemePreference>
        legend="Giao diện"
        name="theme"
        value={value.theme}
        onChange={(theme) => void change('theme', theme)}
        options={(['light', 'dark', 'system'] as const).map((theme) => ({
          value: theme,
          label: THEME_LABELS[theme],
        }))}
      />
      <p className="text-sm text-ink-muted">
        Đổi số từ hoặc cấp độ sẽ chọn lại các từ mới hôm nay bạn chưa học. Từ đã học vẫn được giữ.
      </p>
    </div>
  );
}
