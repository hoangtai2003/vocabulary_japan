import type { ReactNode } from 'react';
import { Brand } from '@/components/layout/Brand';
import { Card } from '@/components/ui/Card';

/** Khung chung của trang Đăng nhập và Đăng ký. */
export function AuthLayout({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[400px] flex-col justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-start gap-3">
        <Brand />
        <p className="text-sm text-ink-muted">Mỗi ngày vài từ, đều tay như luyện chữ trong vở.</p>
      </div>
      <Card className="animate-page-in p-5 sm:p-6">
        <h1 className="text-[28px]">{title}</h1>
        <p className="mb-5 mt-1 text-pretty text-ink-muted">{intro}</p>
        {children}
      </Card>
      <p className="mt-5 text-center text-sm text-ink-muted">{footer}</p>
    </main>
  );
}
