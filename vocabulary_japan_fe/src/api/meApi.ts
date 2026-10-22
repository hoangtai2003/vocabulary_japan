import type {
  DeleteAccountRequest,
  PasswordChangeRequest,
  ProfileUpdate,
  SettingsUpdate,
  UserResponse,
} from '@/types/api';
import { apiClient } from './client';

export const meApi = {
  updateSettings: (body: SettingsUpdate) => apiClient.put<UserResponse>('/me/settings', body),
  updateProfile: (body: ProfileUpdate) => apiClient.put<UserResponse>('/me/profile', body),
  changePassword: (body: PasswordChangeRequest) => apiClient.put<void>('/me/password', body),
  deleteAccount: (body: DeleteAccountRequest) => apiClient.delete<void>('/me', body),
};
