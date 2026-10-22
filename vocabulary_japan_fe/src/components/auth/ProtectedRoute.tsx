import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { loginPathWithNext } from '@/utils/safeNext';
import { AuthGate } from './AuthGate';

/**
 * Chưa đăng nhập thì chuyển về /dang-nhap?next=<đường dẫn hiện tại> (phiên hết hạn, mở link khi
 * chưa đăng nhập). Riêng khi người dùng vừa chủ động đăng xuất thì về /dang-nhap không kèm next.
 */
export function ProtectedRoute() {
  const { user, signedOutOnPurpose } = useAuth();
  const location = useLocation();
  return (
    <AuthGate>
      {user ? (
        <Outlet />
      ) : (
        <Navigate
          to={signedOutOnPurpose ? '/dang-nhap' : loginPathWithNext(location.pathname, location.search)}
          replace
        />
      )}
    </AuthGate>
  );
}
