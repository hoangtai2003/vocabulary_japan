import { QueryClient } from '@tanstack/react-query';
import { isApiError } from './client';

/** Không thử lại lỗi 4xx (dữ liệu sai, chưa đăng nhập...); lỗi mạng/5xx thử lại 1 lần. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
