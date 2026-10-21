import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { FormAlert } from '@/components/auth/FormAlert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUpdateProfile } from '@/hooks/queries/useAccount';
import { profileUpdateSchema } from '@/schemas/account';
import { toast } from '@/stores/toastStore';
import { applyApiErrors } from '@/utils/formErrors';

type Values = z.input<typeof profileUpdateSchema>;

/** Đổi tên hiển thị. Nút lưu chỉ bật khi tên đã khác tên hiện tại. */
export function DisplayNameForm({ displayName }: { displayName: string }) {
  const updateProfile = useUpdateProfile();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values, unknown, z.output<typeof profileUpdateSchema>>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { display_name: displayName },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { user } = await updateProfile.mutateAsync(values);
      reset({ display_name: user.display_name });
      toast.success(`Đã đổi tên thành ${user.display_name}`);
    } catch (error) {
      setFormError(applyApiErrors(error, setError, ['display_name']));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormAlert message={formError} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Input
          label="Tên hiển thị"
          autoComplete="nickname"
          hint="Từ 2 đến 40 ký tự. Tên này hiện trong lời chào mỗi ngày."
          error={errors.display_name?.message}
          containerClassName="flex-1"
          {...register('display_name')}
        />
        <Button
          type="submit"
          variant="secondary"
          loading={isSubmitting}
          disabled={!isDirty}
          className="sm:mt-[26px]"
        >
          {isSubmitting ? 'Đang lưu…' : 'Lưu tên'}
        </Button>
      </div>
    </form>
  );
}
