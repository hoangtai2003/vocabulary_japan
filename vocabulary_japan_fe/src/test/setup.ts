import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '@/mock/server';

// MSW chặn request ở tầng mạng cho mọi test; request không có handler là lỗi.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  // Mỗi test bắt đầu với dữ liệu mock gốc và chưa đăng nhập.
  localStorage.clear();
});
afterAll(() => server.close());

// jsdom chưa có matchMedia; themeStore và useMediaQuery cần nó.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
