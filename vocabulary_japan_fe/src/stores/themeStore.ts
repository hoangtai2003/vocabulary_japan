import { create } from 'zustand';
import type { ThemePreference } from '@/types/user';

/** Khóa localStorage, dùng chung với script chống nháy màu trong index.html. */
export const THEME_STORAGE_KEY = 'jpvocab:theme';

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function readStoredPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    // localStorage bị chặn
  }
  return 'system';
}

function resolve(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return darkQuery().matches ? 'dark' : 'light';
  return preference;
}

function apply(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

interface ThemeState {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  /** Đổi giao diện, ghi vào localStorage và áp class .dark ngay. */
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const preference = readStoredPreference();
  return {
    preference,
    resolved: resolve(preference),
    setPreference: (next) => {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // bỏ qua
      }
      const resolved = resolve(next);
      apply(resolved);
      set({ preference: next, resolved });
    },
  };
});

/** Theo dõi thay đổi giao diện hệ thống khi đang chọn "Theo hệ thống". Gọi một lần lúc khởi động. */
export function watchSystemTheme(): () => void {
  const query = darkQuery();
  const onChange = () => {
    const { preference } = useThemeStore.getState();
    if (preference !== 'system') return;
    const resolved = resolve('system');
    apply(resolved);
    useThemeStore.setState({ resolved });
  };
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
