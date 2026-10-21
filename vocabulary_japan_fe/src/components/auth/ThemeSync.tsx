import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useThemeStore, watchSystemTheme } from '@/stores/themeStore';

/**
 * Đồng bộ giao diện (mục 6): chưa đăng nhập thì dùng lựa chọn trong localStorage (mặc định
 * Theo hệ thống); đã đăng nhập thì settings.theme từ server là nguồn chính và được ghi đè
 * vào localStorage, để lần mở sau script trong index.html áp đúng màu ngay từ đầu.
 */
export function ThemeSync() {
  const serverTheme = useAuth().user?.settings.theme;
  const setPreference = useThemeStore((s) => s.setPreference);

  useEffect(() => watchSystemTheme(), []);

  useEffect(() => {
    if (serverTheme) setPreference(serverTheme);
  }, [serverTheme, setPreference]);

  return null;
}
