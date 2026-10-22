import { createApp } from './app.ts';
import { env } from './config/env.ts';
import { prisma } from './db/prisma.ts';
import { logger } from './logger.ts';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API đang chạy ở http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

/**
 * Tắt server êm khi nhận SIGINT/SIGTERM (Ctrl+C, systemd stop): ngừng nhận kết nối mới, chờ
 * request đang chạy xong. Quá 10 giây thì thoát cưỡng bức.
 */
function shutdown(signal: string) {
  logger.info(`Nhận ${signal}, đang tắt server…`);
  server.close((error) => {
    void prisma.$disconnect().finally(() => {
      if (error) {
        logger.error({ err: error }, 'Lỗi khi tắt server');
        process.exit(1);
      }
      process.exit(0);
    });
  });
  setTimeout(() => {
    logger.warn('Tắt server quá lâu, thoát cưỡng bức');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
