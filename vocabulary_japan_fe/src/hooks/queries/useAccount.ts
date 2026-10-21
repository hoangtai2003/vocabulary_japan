import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meApi } from '@/api/meApi';
import { queryKeys } from '@/api/queryKeys';
import type { SettingsUpdate, UserResponse } from '@/types/api';
import type { User } from '@/types/user';
import { toDateKey } from '@/utils/dates';
import { downloadJson } from '@/utils/download';

/** PUT /me/settings. Đổi mục tiêu/cấp độ thì tải lại từ hôm nay và thống kê. */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation<UserResponse, Error, SettingsUpdate>({
    mutationFn: meApi.updateSettings,
    onSuccess: ({ user }, variables) => {
      queryClient.setQueryData<User | null>(queryKeys.auth.me, user);
      if (variables.daily_goal !== undefined || variables.level !== undefined) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.words.today });
        void queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      }
    },
  });
}

/** PUT /me/profile */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: meApi.updateProfile,
    onSuccess: ({ user }) => queryClient.setQueryData<User | null>(queryKeys.auth.me, user),
  });
}

/** PUT /me/password */
export function useChangePassword() {
  return useMutation({ mutationFn: meApi.changePassword });
}

/** GET /me/export rồi tải về file JSON. */
export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const data = await meApi.exportData();
      downloadJson(data, `jpvocab-du-lieu-${toDateKey(new Date())}.json`);
      return data;
    },
  });
}

/** DELETE /me. Thành công thì xóa toàn bộ cache, người dùng thành chưa đăng nhập. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: meApi.deleteAccount,
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData<User | null>(queryKeys.auth.me, null);
    },
  });
}
