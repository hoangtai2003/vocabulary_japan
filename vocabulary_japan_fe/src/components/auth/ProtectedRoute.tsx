import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { loginPathWithNext } from '@/utils/safeNext';
import { AuthGate } from './AuthGate';

/** Chưa đăng nhập thì chuyển về /dang-nhap?next=<đường dẫn hiện tại>. */
export function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();
  return (
    <AuthGate>
      {user ? (
        <Outlet />
      ) : (
        <Navigate to={loginPathWithNext(location.pathname, location.search)} replace />
      )}
    </AuthGate>
  );
}
