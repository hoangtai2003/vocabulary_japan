import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { createQueryClient } from './api/queryClient';
import { ThemeSync } from './components/auth/ThemeSync';
import { Toaster } from './components/ui/Toast';
import { AuthProvider } from './context/AuthProvider';
import { createAppRouter } from './router';

export default function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(createAppRouter);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeSync />
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
