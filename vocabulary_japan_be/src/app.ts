import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.ts';
import { logger } from './logger.ts';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.ts';
import { healthRouter } from './modules/health/routes.ts';

/**
 * Tạo Express app (middleware, router, error handler) nhưng không gọi listen, để test dùng
 * thẳng với supertest. Các module tính năng được gắn vào apiRouter ở các giai đoạn sau.
 */
export function createApp(): Express {
  const app = express();

  // Sau Nginx: tin header X-Forwarded-* từ proxy cục bộ, để rate limit lấy đúng IP người dùng.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(pinoHttp({ logger, quietReqLogger: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const apiRouter = express.Router();
  apiRouter.use(healthRouter);
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
