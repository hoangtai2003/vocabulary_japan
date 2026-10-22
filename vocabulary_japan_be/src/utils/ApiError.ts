/** Mã lỗi theo API_CONTRACT.md (mục 4.4). */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

/**
 * Lỗi nghiệp vụ. Service ném ApiError; error handler duy nhất (middleware/errorHandler.ts) đổi
 * thành JSON { error: { code, message, fields? } }. message bằng tiếng Việt, hiển thị cho người dùng.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static validation(fields: Record<string, string>, message = 'Dữ liệu chưa hợp lệ') {
    return new ApiError(400, 'VALIDATION_ERROR', message, fields);
  }

  static unauthorized(message = 'Bạn cần đăng nhập để tiếp tục') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Bạn không có quyền thực hiện thao tác này') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Không tìm thấy dữ liệu') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
}
