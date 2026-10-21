import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

/** Đăng xuất rồi về /dang-nhap. Lỗi mạng khi gọi API vẫn đăng xuất phía client. */
export function useLogout(): () => Promise<void> {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return useCallback(async () => {
    await logout().catch(() => undefined);
    navigate('/dang-nhap', { replace: true });
  }, [logout, navigate]);
}
