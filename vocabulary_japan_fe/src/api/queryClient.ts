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

/**
 * Xóa dữ liệu người dùng phía client khi đăng xuất, phiên hết hạn hoặc xóa tài khoản.
 *
 * Không dùng queryClient.clear(): lệnh đó xóa hẳn query auth/me, trong khi useQuery của
 * AuthProvider vẫn bám vào query cũ, nên setQueryData sau đó tạo query mới mà AuthProvider không
 * thấy — giao diện vẫn giữ người dùng cũ. Ở đây: hủy request đang chạy, xóa mọi query khác,
 * giữ query auth/me và đặt nó về null để AuthProvider chuyển sang "chưa đăng nhập".
 */
export function clearUserData(queryClient: QueryClient): void {
  void queryClient.cancelQueries();
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
  queryClient.setQueryData(['auth', 'me'], null);
}
