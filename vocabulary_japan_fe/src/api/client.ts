import type { ApiErrorBody, ClientErrorCode, ErrorCode } from '@/types/api';
import { API_PREFIX, API_URL } from './env';

export const REQUEST_TIMEOUT_MS = 15_000;

/** Lỗi thống nhất cho mọi request. status = 0 khi không nhận được phản hồi. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | ClientErrorCode;
  readonly fields?: Record<string, string>;
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    code: ErrorCode | ClientErrorCode,
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
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

// ---------- Xử lý 401 ----------

/** Các đường dẫn mà 401 là kết quả bình thường, không phải phiên hết hạn. */
const UNAUTHORIZED_EXEMPT = ['/auth/login', '/auth/me'];

type UnauthorizedHandler = () => void;

/** Mặc định: chuyển hẳn về trang đăng nhập. AuthProvider thay bằng cách xóa cache trong SPA. */
let unauthorizedHandler: UnauthorizedHandler = () => {
  const { pathname, search } = window.location;
  if (pathname.startsWith('/dang-nhap')) return;
  window.location.assign(`/dang-nhap?next=${encodeURIComponent(pathname + search)}`);
};

export function setUnauthorizedHandler(handler: UnauthorizedHandler): () => void {
  const previous = unauthorizedHandler;
  unauthorizedHandler = handler;
  return () => {
    unauthorizedHandler = previous;
  };
}

// ---------- Request ----------

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Gửi tệp thô (ví dụ ảnh) thay cho body JSON, kèm Content-Type của tệp. */
  file?: Blob;
  query?: QueryParams;
  signal?: AbortSignal;
}

export function buildUrl(path: string, query?: QueryParams): string {
  // new URL cần địa chỉ tuyệt đối; khi VITE_API_URL rỗng thì dùng origin hiện tại.
  const url = new URL(`${API_URL}${API_PREFIX}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function readError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    if (body.error?.code) {
      return new ApiError(
        response.status,
        body.error.code,
        body.error.message,
        body.error.fields,
        body.error.details,
      );
    }
  } catch {
    // Body không phải JSON: dùng thông báo chung bên dưới.
  }
  return response.status >= 500
    ? new ApiError(
        response.status,
        'INTERNAL_ERROR',
        'Máy chủ đang gặp sự cố. Thử lại sau ít phút.',
      )
    : new ApiError(response.status, 'UNKNOWN', 'Đã có lỗi xảy ra. Thử lại nhé.');
}

/**
 * Gửi request và trả về Response thành công (2xx). Ném ApiError cho mọi lỗi.
 * Giữ nguyên AbortError khi người gọi (TanStack Query) tự hủy request.
 */
async function send(path: string, options: RequestOptions = {}): Promise<Response> {
  const { method = 'GET', body, file, query, signal } = options;

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(file ? { 'Content-Type': file.type } : {}),
        ...(body !== undefined && !file ? { 'Content-Type': 'application/json' } : {}),
      },
      body: file ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: combined,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.signal.aborted) {
      throw new ApiError(0, 'TIMEOUT', 'Máy chủ phản hồi quá lâu. Thử lại sau.');
    }
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const error = await readError(response);
    if (response.status === 401 && !UNAUTHORIZED_EXEMPT.includes(path)) {
      unauthorizedHandler();
    }
    throw error;
  }
  return response;
}

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const response = await send(path, options);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Tên file trong header Content-Disposition (attachment; filename="…"). */
function filenameOf(response: Response, fallback: string): string {
  const header = response.headers.get('Content-Disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
}

export const apiClient = {
  get: <T>(path: string, query?: QueryParams, signal?: AbortSignal) =>
    request<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
  /** POST một tệp thô (ảnh), nhận JSON. */
  upload: <T>(path: string, file: Blob) => request<T>(path, { method: 'POST', file }),
  /** GET một file tải về (export): nội dung và tên file server đặt. */
  download: async (path: string, fallbackName: string) => {
    const response = await send(path);
    return { blob: await response.blob(), filename: filenameOf(response, fallbackName) };
  },
};
