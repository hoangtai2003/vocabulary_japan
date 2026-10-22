import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '@/api/authApi';
import { isApiError, setUnauthorizedHandler } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { LoginRequest, RegisterRequest } from '@/types/api';
import type { User } from '@/types/user';
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext';
import { clearUserData } from '@/api/queryClient';

/** /auth/me trả 401 nghĩa là chưa đăng nhập: không phải lỗi, trả về null. */
async function fetchCurrentUser(signal: AbortSignal): Promise<User | null> {
  try {
    return (await authApi.me(signal)).user;
  } catch (error) {
    if (isApiError(error) && error.status === 401) return null;
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Gọi /auth/me một lần khi tải trang; sau đó cache được cập nhật trực tiếp khi
  // đăng nhập, đăng xuất, đổi hồ sơ.
  const meQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  // Phiên hết hạn (401 ở request khác): xóa dữ liệu người dùng trong cache. ProtectedRoute
  // thấy user = null sẽ chuyển về /dang-nhap?next=<trang hiện tại>.
  useEffect(
    () =>
      setUnauthorizedHandler(() => clearUserData(queryClient)),
    [queryClient],
  );

  const [signedOutOnPurpose, setSignedOutOnPurpose] = useState(false);
  const markSignedOutOnPurpose = useCallback(() => setSignedOutOnPurpose(true), []);

  const login = useCallback(
    async (body: LoginRequest) => {
      const { user } = await authApi.login(body);
      setSignedOutOnPurpose(false);
      queryClient.setQueryData<User | null>(queryKeys.auth.me, user);
      return user;
    },
    [queryClient],
  );

  const register = useCallback(
    async (body: RegisterRequest) => {
      const { user } = await authApi.register(body);
      setSignedOutOnPurpose(false);
      queryClient.setQueryData<User | null>(queryKeys.auth.me, user);
      return user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Kể cả khi gọi API lỗi, phía client vẫn đăng xuất. Đánh dấu trước khi xóa dữ liệu, để
      // ProtectedRoute thấy cả hai thay đổi trong cùng một lần render.
      setSignedOutOnPurpose(true);
      clearUserData(queryClient);
    }
  }, [queryClient]);

  const { data, isPending, isError, error, refetch } = meQuery;
  const user = data ?? null;
  let status: AuthStatus;
  if (isPending) status = 'loading';
  else if (isError && data === undefined) status = 'error';
  else status = user ? 'authenticated' : 'anonymous';

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      error: status === 'error' ? error : null,
      retry: () => void refetch(),
      login,
      register,
      logout,
      signedOutOnPurpose,
      markSignedOutOnPurpose,
    }),
    [user, status, error, refetch, login, register, logout, signedOutOnPurpose, markSignedOutOnPurpose],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
