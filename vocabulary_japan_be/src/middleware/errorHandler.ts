import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.ts';
import { zodFieldErrors } from '../utils/zodFields.ts';

/** Đường dẫn không có route: trả 404 dạng JSON (không trả trang HTML mặc định của Express). */
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(ApiError.notFound('Không tìm thấy đường dẫn này'));
};

interface BodyParserError extends Error {
  type?: string;
  status?: number;
}

function isBodyParserError(error: unknown): error is BodyParserError {
  return error instanceof Error && typeof (error as BodyParserError).type === 'string';
}

/**
 * Error handler duy nhất. Mọi lỗi (kể cả lỗi async, Express 5 tự chuyển về đây) thành
 * { error: { code, message, fields? } }:
 * - ApiError → đúng status/code của nó
 * - ZodError → 400 VALIDATION_ERROR kèm fields
 * - body JSON hỏng hoặc quá lớn → 400 VALIDATION_ERROR
 * - còn lại → 500 INTERNAL_ERROR; stack trace chỉ ghi vào log, không trả ra response
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  let apiError: ApiError;

  if (error instanceof ApiError) {
    apiError = error;
  } else if (error instanceof ZodError) {
    apiError = ApiError.validation(zodFieldErrors(error));
  } else if (isBodyParserError(error) && error.type === 'entity.parse.failed') {
    apiError = ApiError.validation({ _: 'Body phải là JSON hợp lệ' }, 'Dữ liệu gửi lên không hợp lệ');
  } else if (isBodyParserError(error) && error.type === 'entity.too.large') {
    apiError = ApiError.validation({ _: 'Dữ liệu tối đa 1 MB' }, 'Dữ liệu gửi lên quá lớn');
  } else {
    req.log.error({ err: error }, 'Lỗi không mong đợi');
    apiError = new ApiError(500, 'INTERNAL_ERROR', 'Máy chủ đang gặp sự cố. Thử lại sau ít phút.');
  }

  if (res.headersSent) return;
  res.status(apiError.status).json({
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.fields ? { fields: apiError.fields } : {}),
    },
  });
};
