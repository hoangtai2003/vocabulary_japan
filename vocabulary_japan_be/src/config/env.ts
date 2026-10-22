import { existsSync } from 'node:fs';
import { z } from 'zod';

// Đọc .env nếu có (Node ≥ 21.7 có sẵn, không cần dotenv). Biến đã đặt sẵn trong môi trường
// (systemd, CI, Vitest) không bị ghi đè.
if (existsSync('.env')) process.loadEnvFile('.env');

const booleanString = z
  .enum(['true', 'false'], { error: 'Phải là true hoặc false' })
  .transform((value) => value === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().url().optional(),
    CORS_ORIGIN: z.string().url({ error: 'Phải là URL, ví dụ http://localhost:5173' }),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    COOKIE_SECURE: booleanString.default(false),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    APP_TIMEZONE: z
      .string()
      .default('Asia/Ho_Chi_Minh')
      .refine((tz) => {
        try {
          new Intl.DateTimeFormat('en-US', { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      }, 'Múi giờ IANA không hợp lệ, ví dụ Asia/Ho_Chi_Minh'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    /** Giá trị cho app.set('trust proxy'); mặc định chỉ tin proxy trên localhost (Nginx cùng máy). */
    TRUST_PROXY: z.string().default('loopback'),
  })
  .superRefine((env, ctx) => {
    if (env.COOKIE_SAME_SITE === 'none' && !env.COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SAME_SITE'],
        message: 'SameSite=None bắt buộc COOKIE_SECURE=true',
      });
    }
    if (env.NODE_ENV === 'production' && !env.COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'Production phải chạy HTTPS với COOKIE_SECURE=true',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/**
 * Đọc và kiểm tra biến môi trường một lần lúc khởi động. Sai thì in rõ từng biến lỗi rồi dừng
 * ngay, thay vì chạy tiếp với cấu hình hỏng.
 */
function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    console.error(`Biến môi trường không hợp lệ:\n${lines.join('\n')}\nXem .env.example.`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
