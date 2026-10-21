import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { safeNext } from '@/utils/safeNext';
import { AuthGate } from './AuthGate';

/**
 * Trang chỉ dành cho khách (/dang-nhap, /dang-ky). Đã đăng nhập thì chuyển về ?next=
 * (chỉ đường dẫn nội bộ), không có thì về /. Đây cũng là nơi duy nhất chuyển hướng sau khi
 * đăng nhập/đăng ký thành công: AuthProvider cập nhật user, route này tự điều hướng.
 */
export function GuestRoute() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  return (
    <AuthGate>
      {user ? <Navigate to={safeNext(params.get('next'))} replace /> : <Outlet />}
    </AuthGate>
  );
}
