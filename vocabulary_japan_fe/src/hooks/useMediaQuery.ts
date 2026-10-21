import { useSyncExternalStore } from 'react';

/** true khi media query khớp; cập nhật khi cửa sổ đổi kích thước. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const DESKTOP_QUERY = '(min-width: 768px)';
