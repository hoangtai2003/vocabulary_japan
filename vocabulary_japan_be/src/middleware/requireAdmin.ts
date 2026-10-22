import type { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError.ts';

/** Đặt sau requireAuth: không phải admin → 403 FORBIDDEN. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) throw ApiError.unauthorized();
  if (req.user.role !== 'admin') throw ApiError.forbidden();
  next();
};
