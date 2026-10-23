import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.ts';
import { logger } from './logger.ts';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.ts';
import { originCheck } from './middleware/originCheck.ts';
import { createRateLimiters } from './middleware/rateLimit.ts';
import { adminRouter } from './modules/admin/routes.ts';
import { createAuthRouter } from './modules/auth/routes.ts';
import { examsRouter } from './modules/exams/routes.ts';
import { meRouter } from './modules/me/routes.ts';
import { quizRouter } from './modules/quiz/routes.ts';
import { reviewsRouter } from './modules/reviews/routes.ts';
import { statsRouter } from './modules/stats/routes.ts';
import { wordsRouter } from './modules/words/routes.ts';
import { healthRouter } from './modules/health/routes.ts';

/**
 * Tạo Express app (middleware, router, error handler) nhưng không gọi listen, để test dùng
 * thẳng với supertest. Các module tính năng được gắn vào apiRouter ở các giai đoạn sau.
 */
export function createApp(): Express {
  const app = express();

  // Sau reverse proxy (Caddy): tin header X-Forwarded-* từ proxy cục bộ, để rate limit lấy đúng IP người dùng.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(pinoHttp({ logger, quietReqLogger: true }));
  // Giới hạn body JSON 1 MB (prompt mục 6.3). Riêng nhập đề nhận file tới 5 MB (SRS 2.0, FR-IMP-01);
  // file được gửi dưới dạng chuỗi JSON nên body lớn hơn file một chút (ký tự thoát).
  const jsonDefault = express.json({ limit: '1mb' });
  const jsonImport = express.json({ limit: '8mb' });
  app.use((req, res, next) => (req.path === '/api/admin/exams/import' ? jsonImport : jsonDefault)(req, res, next));
  app.use(cookieParser());

  const limiters = createRateLimiters();
  const apiRouter = express.Router();
  apiRouter.use(limiters.api);
  apiRouter.use(originCheck);
  apiRouter.use(healthRouter);
  apiRouter.use(createAuthRouter(limiters.auth));
  apiRouter.use(wordsRouter);
  apiRouter.use(reviewsRouter);
  apiRouter.use(quizRouter);
  apiRouter.use(examsRouter);
  apiRouter.use(statsRouter);
  apiRouter.use(meRouter);
  apiRouter.use(adminRouter);
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
