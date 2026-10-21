import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ForbiddenPage from '@/pages/ForbiddenPage';

/** Không phải admin thì hiển thị trang 403 thân thiện (vẫn trong layout). */
export function AdminRoute() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <Outlet /> : <ForbiddenPage />;
}
