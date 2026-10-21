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
  },
  build: {
    // Chunk mock (MSW + dữ liệu mẫu) ~580 kB chỉ được tải khi VITE_API_MODE=mock.
    chunkSizeWarningLimit: 700,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Giới hạn số worker để chạy ổn định trên máy ít RAM.
    maxWorkers: 2,
    // Test chạy với MSW node, luôn ở chế độ mock.
    env: { VITE_API_MODE: 'mock' },
  },
});
