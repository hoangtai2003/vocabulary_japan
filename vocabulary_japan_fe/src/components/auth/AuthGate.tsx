import type { ReactNode } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { useAuth } from '@/hooks/useAuth';

/**
 * Chờ kết quả /auth/me trước khi quyết định hiển thị gì: trong lúc chờ là màn hình chờ toàn
 * trang (không nháy sang trang đăng nhập); lỗi mạng/5xx thì cho thử lại.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, retry } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'error') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">
        <ErrorState
          className="w-full"
          title="Chưa kết nối được máy chủ"
          message="Kiểm tra mạng rồi thử lại. Dữ liệu học của bạn vẫn được giữ nguyên."
          onRetry={retry}
        />
      </div>
    );
  }
  return <>{children}</>;
}
