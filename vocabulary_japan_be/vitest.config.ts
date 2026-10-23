import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './tests/helpers/testDbUrl.ts';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Biến môi trường tối thiểu cho test; giai đoạn database sẽ trỏ DATABASE_URL sang DB test (cổng 5433).
    env: {
      NODE_ENV: 'test',
      // Test chỉ dùng DB test (cổng 5433), không bao giờ đụng DB dev.
      DATABASE_URL: TEST_DATABASE_URL,
      LOG_LEVEL: 'silent',
      CORS_ORIGIN: 'http://localhost:5173',
      // Ảnh tải lên trong test ghi vào thư mục tạm, không lẫn với uploads/ của máy dev.
      UPLOAD_DIR: join(tmpdir(), 'jpvocab-test-uploads'),
    },
    // Máy dev ít RAM: giới hạn số worker giống frontend.
    maxWorkers: 2,
    // Các file test API dùng chung một DB test và xóa dữ liệu giữa các test: chạy lần lượt từng file.
    fileParallelism: false,
    globalSetup: ['tests/helpers/globalSetup.ts'],
  },
});
