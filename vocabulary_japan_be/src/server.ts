import { createApp } from './app.ts';
import { env } from './config/env.ts';
import { prisma } from './db/prisma.ts';
import { logger } from './logger.ts';
import { deleteExpiredSessions } from './modules/auth/sessions.ts';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API đang chạy ở http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

/** Dọn phiên hết hạn lúc khởi động và mỗi 24 giờ (prompt mục 6.1). Lỗi chỉ ghi log, không làm sập server. */
async function cleanupSessions() {
  try {
    const count = await deleteExpiredSessions();
    if (count > 0) logger.info(`Đã dọn ${count} phiên đăng nhập hết hạn`);
  } catch (error) {
    logger.error({ err: error }, 'Dọn phiên hết hạn thất bại');
  }
}
void cleanupSessions();
const cleanupTimer = setInterval(() => void cleanupSessions(), 24 * 60 * 60 * 1000);
cleanupTimer.unref();

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
