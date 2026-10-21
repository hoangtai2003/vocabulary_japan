import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { FormAlert } from '@/components/auth/FormAlert';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useChangePassword } from '@/hooks/queries/useAccount';
import { passwordChangeFormSchema, type PasswordChangeFormValues } from '@/schemas/account';
import { toast } from '@/stores/toastStore';
import { applyApiErrors } from '@/utils/formErrors';

const EMPTY: PasswordChangeFormValues = {
  current_password: '',
  new_password: '',
  confirm_password: '',
};

/** Đổi mật khẩu: mật khẩu hiện tại, mật khẩu mới, nhập lại. Thành công thì xóa trắng form. */
export function PasswordForm() {
  const changePassword = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeFormValues, unknown, z.output<typeof passwordChangeFormSchema>>({
    resolver: zodResolver(passwordChangeFormSchema),
    defaultValues: EMPTY,
  });

  const onSubmit = handleSubmit(async ({ current_password, new_password }) => {
    setFormError(null);
    try {
      await changePassword.mutateAsync({ current_password, new_password });
      reset(EMPTY);
      toast.success('Đã đổi mật khẩu. Lần đăng nhập sau, dùng mật khẩu mới.');
    } catch (error) {
      setFormError(applyApiErrors(error, setError, ['current_password', 'new_password']));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={formError} />
      <PasswordInput
        label="Mật khẩu hiện tại"
        autoComplete="current-password"
        error={errors.current_password?.message}
        {...register('current_password')}
      />
      <PasswordInput
        label="Mật khẩu mới"
        autoComplete="new-password"
        hint="Ít nhất 6 ký tự."
        error={errors.new_password?.message}
        {...register('new_password')}
      />
      <PasswordInput
        label="Nhập lại mật khẩu mới"
        autoComplete="new-password"
        error={errors.confirm_password?.message}
        {...register('confirm_password')}
      />
      <Button type="submit" variant="secondary" loading={isSubmitting} className="self-start">
        {isSubmitting ? 'Đang đổi…' : 'Đổi mật khẩu'}
      </Button>
    </form>
  );
}
