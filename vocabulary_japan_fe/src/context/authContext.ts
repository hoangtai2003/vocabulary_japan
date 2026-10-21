import { createContext } from 'react';
import type { LoginRequest, RegisterRequest } from '@/types/api';
import type { User } from '@/types/user';

/**
 * - loading: đang gọi /auth/me lần đầu (hiển thị màn hình chờ toàn trang)
 * - authenticated / anonymous: đã biết kết quả
 * - error: /auth/me lỗi mạng hoặc 5xx (hiển thị lỗi kèm nút thử lại)
 */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  error: Error | null;
  retry: () => void;
  login: (body: LoginRequest) => Promise<User>;
  register: (body: RegisterRequest) => Promise<User>;
  /** Gọi /auth/logout và xóa toàn bộ cache. Điều hướng về /dang-nhap do nơi gọi đảm nhận. */
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
