import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Giữ đúng cổng 5173: backend chỉ nhận Origin http://localhost:5173 (CORS_ORIGIN). Cổng bận
    // thì báo lỗi luôn thay vì tự đổi sang 5174 rồi mọi request đổi dữ liệu bị 403.
    strictPort: true,
    // Chuyển /api sang backend (cổng 4000), để trình duyệt thấy frontend và API cùng một
    // origin — cookie hoạt động, không cần CORS.
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:4000',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Giới hạn số worker để chạy ổn định trên máy ít RAM.
    maxWorkers: 2,
  },
});
