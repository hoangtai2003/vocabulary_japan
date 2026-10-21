import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AdminRoute } from './components/auth/AdminRoute';
import { GuestRoute } from './components/auth/GuestRoute';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout, type RouteHandle } from './components/layout/AppLayout';
import { RouteError } from './components/layout/RouteError';
import { FullPageLoader } from './components/ui/FullPageLoader';

type PageModule = { default: ComponentType };

/** Lazy load từng trang: mỗi trang là một chunk riêng, tải khi điều hướng tới. */
const page = (load: () => Promise<PageModule>) => async () => ({
  Component: (await load()).default,
});

export const routes: RouteObject[] = [
  {
    path: '/',
    errorElement: <RouteError />,
    // Hiện trong lúc tải mã của trang đầu tiên (lazy), để không bị trang trắng.
    HydrateFallback: FullPageLoader,
    children: [
      {
        element: <GuestRoute />,
        children: [
          { path: 'dang-nhap', lazy: page(() => import('./pages/LoginPage')) },
          { path: 'dang-ky', lazy: page(() => import('./pages/RegisterPage')) },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, lazy: page(() => import('./pages/TodayPage')) },
              { path: 'hoc', lazy: page(() => import('./pages/LearnPage')) },
              { path: 'on-tap', lazy: page(() => import('./pages/ReviewPage')) },
              { path: 'quiz', lazy: page(() => import('./pages/QuizPage')) },
              {
                path: 'tu-vung',
                lazy: page(() => import('./pages/WordsPage')),
                handle: { wide: true } satisfies RouteHandle,
              },
              { path: 'tien-do', lazy: page(() => import('./pages/ProgressPage')) },
              { path: 'ho-so', lazy: page(() => import('./pages/ProfilePage')) },
              { path: 'them', lazy: page(() => import('./pages/MorePage')) },
              {
                element: <AdminRoute />,
                children: [
                  {
                    path: 'quan-tri',
                    lazy: page(() => import('./pages/AdminPage')),
                    handle: { wide: true } satisfies RouteHandle,
                  },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', lazy: page(() => import('./pages/NotFoundPage')) },
    ],
  },
];

/** Bật sẵn hành vi của React Router v7 (và tắt cảnh báo future flag trên console). */
export const ROUTER_FUTURE = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
} as const;

export function createAppRouter() {
  return createBrowserRouter(routes, { future: ROUTER_FUTURE });
}
