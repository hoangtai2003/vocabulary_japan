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
import { loginSchema, type LoginFormValues } from '@/schemas/auth';
import { applyApiErrors } from '@/utils/formErrors';

export default function LoginPage() {
  useDocumentTitle('Đăng nhập');
  const { login } = useAuth();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues, unknown, z.output<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Đăng nhập xong, GuestRoute tự chuyển về ?next= (hoặc /).
  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
    } catch (error) {
      setFormError(applyApiErrors(error, setError, ['email', 'password']));
    }
  });

  const next = params.get('next');
  const registerHref = next ? `/dang-ky?next=${encodeURIComponent(next)}` : '/dang-ky';

  return (
    <AuthLayout
      title="Đăng nhập"
      intro="Mở sổ để học tiếp từ chỗ bạn dừng lại."
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link
            to={registerHref}
            className="font-semibold text-son-ink underline underline-offset-4"
          >
            Đăng ký
          </Link>
        </>
      }
    >
      <FormAlert message={formError} />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button
          type="submit"
          size="lg"
          block
          loading={isSubmitting}
          className="mt-1"
        >
          {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </form>
    </AuthLayout>
  );
}
