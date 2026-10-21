import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import type { z } from 'zod';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormAlert } from '@/components/auth/FormAlert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { registerFormSchema, type RegisterFormValues } from '@/schemas/auth';
import { toast } from '@/stores/toastStore';
import { applyApiErrors } from '@/utils/formErrors';

export default function RegisterPage() {
  useDocumentTitle('Đăng ký');
  const { register: registerAccount } = useAuth();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues, unknown, z.output<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { display_name: '', email: '', password: '', confirm_password: '' },
  });

  // Đăng ký xong là đã đăng nhập; GuestRoute tự chuyển trang.
  const onSubmit = handleSubmit(async ({ display_name, email, password }) => {
    setFormError(null);
    try {
      const user = await registerAccount({ display_name, email, password });
      toast.success(`Chào ${user.display_name}! Sổ của bạn đã sẵn sàng.`);
    } catch (error) {
      setFormError(applyApiErrors(error, setError, ['display_name', 'email', 'password']));
    }
  });

  const next = params.get('next');
  const loginHref = next ? `/dang-nhap?next=${encodeURIComponent(next)}` : '/dang-nhap';

  return (
    <AuthLayout
      title="Tạo tài khoản"
      intro="Mỗi ngày 5–20 từ N5–N4. Mất chưa tới một phút để bắt đầu."
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to={loginHref} className="font-semibold text-son-ink underline underline-offset-4">
            Đăng nhập
          </Link>
        </>
      }
    >
      <FormAlert message={formError} />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Tên hiển thị"
          autoComplete="nickname"
          hint="Từ 2 đến 40 ký tự."
          error={errors.display_name?.message}
          {...register('display_name')}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordInput
          label="Mật khẩu"
          autoComplete="new-password"
          hint="Ít nhất 6 ký tự."
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordInput
          label="Nhập lại mật khẩu"
          autoComplete="new-password"
          error={errors.confirm_password?.message}
          {...register('confirm_password')}
        />
        <Button type="submit" size="lg" block loading={isSubmitting} className="mt-1">
          {isSubmitting ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
        </Button>
      </form>
    </AuthLayout>
  );
}
