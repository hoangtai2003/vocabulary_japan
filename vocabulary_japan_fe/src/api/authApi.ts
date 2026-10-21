import type { LoginRequest, RegisterRequest, UserResponse } from '@/types/api';
import { apiClient } from './client';

export const authApi = {
  register: (body: RegisterRequest) => apiClient.post<UserResponse>('/auth/register', body),
  login: (body: LoginRequest) => apiClient.post<UserResponse>('/auth/login', body),
  logout: () => apiClient.post<void>('/auth/logout'),
  me: (signal?: AbortSignal) => apiClient.get<UserResponse>('/auth/me', undefined, signal),
};
