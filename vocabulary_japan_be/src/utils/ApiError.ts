/** Mã lỗi theo API_CONTRACT.md (mục 4.4). */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  // Module luyện đề (SRS 2.0, mục 5.2)
  | 'ATTEMPT_SUBMITTED'
  | 'SECTION_TIME_UP'
  | 'ATTEMPT_IN_PROGRESS'
  | 'EXAM_HAS_ATTEMPTS'
  | 'EXAM_INVALID'
  | 'CONFIRM_REGRADE';

/**
 * Lỗi nghiệp vụ. Service ném ApiError; error handler duy nhất (middleware/errorHandler.ts) đổi
 * thành JSON { error: { code, message, fields?, details? } }. message bằng tiếng Việt, hiển thị cho
 * người dùng. details chỉ có ở lỗi của module luyện đề (danh sách lỗi của đề, mã lượt đang làm…).
 */
export class ApiError extends Error {
  // Khai báo field riêng, không dùng parameter property: seed và create-admin chạy thẳng file .ts
  // bằng Node (chế độ chỉ xóa kiểu), mà chế độ này không hỗ trợ parameter property.
  readonly status: number;
  readonly code: ErrorCode;
  readonly fields?: Record<string, string>;
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    fields?: Record<string, string>,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.details = details;
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

  static conflict(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    return new ApiError(409, code, message, undefined, details);
  }
}
