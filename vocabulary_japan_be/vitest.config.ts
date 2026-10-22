import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Biến môi trường tối thiểu cho test; giai đoạn database sẽ trỏ DATABASE_URL sang DB test (cổng 5433).
    env: {
      NODE_ENV: 'test',
      // Test chỉ dùng DB test (cổng 5433), không bao giờ đụng DB dev.
      DATABASE_URL:
        process.env.DATABASE_URL_TEST ?? 'postgresql://jpvocab:jpvocab@localhost:5433/jpvocab_test',
      LOG_LEVEL: 'silent',
      CORS_ORIGIN: 'http://localhost:5173',
    },
    // Máy dev ít RAM: giới hạn số worker giống frontend.
    maxWorkers: 2,
  },
});
