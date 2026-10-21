import type {
  DeleteAccountRequest,
  ExportData,
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
  exportData: () => apiClient.get<ExportData>('/me/export'),
  deleteAccount: (body: DeleteAccountRequest) => apiClient.delete<void>('/me', body),
};
