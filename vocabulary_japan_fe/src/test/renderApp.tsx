import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createQueryClient } from '@/api/queryClient';
import { AuthProvider } from '@/context/AuthProvider';
import { setSessionUserId } from '@/mock/db';
import { ROUTER_FUTURE, routes } from '@/router';

export const SAMPLE_USER_ID = 'u_user';
export const SAMPLE_ADMIN_ID = 'u_admin';

/**
 * Render toàn bộ app (router thật, MSW node) tại `path`.
 * `as` đặt sẵn phiên đăng nhập giả của tài khoản mẫu.
 */
export function renderApp(path: string, { as }: { as?: string } = {}) {
  if (as) setSessionUserId(as);
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path], future: ROUTER_FUTURE });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { ...utils, router, queryClient };
}
