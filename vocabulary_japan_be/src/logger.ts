import { pino } from 'pino';
import { env } from './config/env.ts';

/**
 * Logger dùng chung. Không bao giờ ghi mật khẩu, cookie hay token: các đường dẫn nhạy cảm bị
 * thay bằng [ẩn] trước khi ghi.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      '*.password',
      '*.current_password',
      '*.new_password',
      '*.passwordHash',
    ],
    censor: '[ẩn]',
  },
  ...(env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } } }
    : {}),
});
