import {
  delay,
  http,
  HttpResponse,
  type DefaultBodyType,
  type HttpResponseResolver,
  type PathParams,
} from 'msw';
import type { ErrorCode } from '@/types/api';
import { getSessionUserId, readDb } from '../db';
import type { MockDb, MockUserRecord } from '../types';

/** Lỗi HTTP ném từ handler, được bọc thành body { error } theo hợp đồng. */
export class MockHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const errors = {
  validation: (fields: Record<string, string>, message = 'Dữ liệu chưa hợp lệ') =>
    new MockHttpError(400, 'VALIDATION_ERROR', message, fields),
  unauthorized: () => new MockHttpError(401, 'UNAUTHORIZED', 'Bạn cần đăng nhập để tiếp tục'),
  forbidden: () => new MockHttpError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này'),
  notFound: (message = 'Không tìm thấy dữ liệu') => new MockHttpError(404, 'NOT_FOUND', message),
};

/** Đường dẫn handler khớp mọi origin: `*\/api/...`, để chạy được cả khi VITE_API_URL có giá trị. */
export const api = (path: string) => `*/api${path}`;

const isTest = import.meta.env.MODE === 'test';

/** ?mockError=1 trên URL trang: mọi request trừ /auth/* trả 500, để kiểm tra giao diện lỗi. */
function mockErrorEnabled(request: Request): boolean {
  if (typeof window === 'undefined') return false;
  if (new URL(request.url).pathname.startsWith('/api/auth/')) return false;
  return new URLSearchParams(window.location.search).get('mockError') === '1';
}

type Resolver = HttpResponseResolver<PathParams, DefaultBodyType, DefaultBodyType>;

/**
 * Bọc resolver: độ trễ ngẫu nhiên 300–600 ms (tắt khi chạy test), giả lập lỗi theo ?mockError=1,
 * và đổi MockHttpError thành response lỗi chuẩn.
 */
export function handle(resolver: Resolver): Resolver {
  return async (info) => {
    if (!isTest) await delay(300 + Math.floor(Math.random() * 300));
    if (mockErrorEnabled(info.request)) {
      return HttpResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Lỗi giả lập (mockError=1)' } },
        { status: 500 },
      );
    }
    try {
      return await resolver(info);
    } catch (error) {
      if (error instanceof MockHttpError) {
        return HttpResponse.json(
          {
            error: {
              code: error.code,
              message: error.message,
              ...(error.fields ? { fields: error.fields } : {}),
            },
          },
          { status: error.status },
        );
      }
      console.error('[mock] Lỗi không mong đợi', error);
      return HttpResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ giả lập' } },
        { status: 500 },
      );
    }
  };
}

export { http, HttpResponse };

export const noContent = () => new HttpResponse(null, { status: 204 });

/** Đọc body JSON; body hỏng thì trả 400. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (body && typeof body === 'object' && !Array.isArray(body))
      return body as Record<string, unknown>;
  } catch {
    // rơi xuống lỗi bên dưới
  }
  throw errors.validation({ _: 'Body phải là JSON object' }, 'Dữ liệu gửi lên không hợp lệ');
}

/** Người dùng hiện tại theo phiên giả; chưa đăng nhập thì ném 401. */
export function requireUser(db: MockDb = readDb()): MockUserRecord {
  const userId = getSessionUserId();
  const user = userId ? db.users.find((u) => u.id === userId) : undefined;
  if (!user) throw errors.unauthorized();
  return user;
}

export function requireAdmin(db: MockDb = readDb()): MockUserRecord {
  const user = requireUser(db);
  if (user.role !== 'admin') throw errors.forbidden();
  return user;
}

/** Bỏ password_hash trước khi trả về client. */
export function publicUser(user: MockUserRecord) {
  const { password_hash: _hash, ...rest } = user;
  return rest;
}

/** Đọc số nguyên dương từ query, sai thì dùng mặc định. */
export function intParam(url: URL, name: string, fallback: number, max = 1000): number {
  const value = Number(url.searchParams.get(name));
  return Number.isInteger(value) && value > 0 ? Math.min(value, max) : fallback;
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    page_size: pageSize,
    total: items.length,
  };
}
