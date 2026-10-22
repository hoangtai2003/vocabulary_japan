import { createApp } from './app.ts';
import { env } from './config/env.ts';
import { prisma } from './db/prisma.ts';
import { logger } from './logger.ts';
import { deleteExpiredSessions } from './modules/auth/sessions.ts';
import { deleteExpiredQuizzes } from './modules/quiz/service.ts';

const app = createApp();

const onListen = () => {
  logger.info(`API đang chạy ở http://${env.HOST ?? 'localhost'}:${env.PORT} (${env.NODE_ENV})`);
};
const server = env.HOST ? app.listen(env.PORT, env.HOST, onListen) : app.listen(env.PORT, onListen);

/**
 * Dọn phiên đăng nhập và bài quiz hết hạn lúc khởi động và mỗi 24 giờ (prompt mục 6.1, 3.2).
 * Lỗi chỉ ghi log, không làm sập server.
 */
async function cleanupSessions() {
  try {
    const sessions = await deleteExpiredSessions();
    const quizzes = await deleteExpiredQuizzes();
    if (sessions + quizzes > 0) logger.info(`Đã dọn ${sessions} phiên đăng nhập và ${quizzes} bài quiz hết hạn`);
  } catch (error) {
    logger.error({ err: error }, 'Dọn dữ liệu hết hạn thất bại');
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
