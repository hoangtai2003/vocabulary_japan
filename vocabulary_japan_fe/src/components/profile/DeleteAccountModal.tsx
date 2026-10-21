import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { FormAlert } from '@/components/auth/FormAlert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useDeleteAccount } from '@/hooks/queries/useAccount';
import { deleteAccountSchema } from '@/schemas/account';
import { toast } from '@/stores/toastStore';
import { applyApiErrors } from '@/utils/formErrors';

export const DELETE_CONFIRM_WORD = 'XÓA';

/**
 * So khớp chữ xác nhận. Chuẩn hóa NFC vì bộ gõ tiếng Việt có thể sinh "Ó" dạng tổ hợp
 * (O + dấu sắc rời) hoặc dựng sẵn; không phân biệt hoa thường, bỏ khoảng trắng hai đầu.
 */
function isConfirmWord(value: string): boolean {
  return value.normalize('NFC').trim().toUpperCase() === DELETE_CONFIRM_WORD;
}

const formSchema = deleteAccountSchema.extend({
  confirm: z.string().refine(isConfirmWord, `Gõ chữ ${DELETE_CONFIRM_WORD} để xác nhận`),
});
type Values = z.input<typeof formSchema>;

/** Hộp thoại xóa tài khoản: nhập mật khẩu và gõ "XÓA". Thành công thì đăng xuất. */
export function DeleteAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const deleteAccount = useDeleteAccount();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values, unknown, z.output<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '', confirm: '' },
  });
  const confirmText = useWatch({ control, name: 'confirm' });

  const close = () => {
    reset();
    setFormError(null);
    onClose();
  };

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await deleteAccount.mutateAsync({ password });
      toast.info('Đã xóa tài khoản và toàn bộ dữ liệu học. Hẹn gặp lại bạn.');
      navigate('/dang-nhap', { replace: true });
    } catch (error) {
      setFormError(applyApiErrors(error, setError, ['password']));
    }
  });

  return (
    <Modal
      open={open}
      onClose={close}
      title="Xóa tài khoản?"
      description="Toàn bộ tiến độ, ghi chú và lịch sử ôn sẽ mất vĩnh viễn. Không thể hoàn tác."
      size="sm"
      dismissible={!isSubmitting}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={isSubmitting}>
            Giữ tài khoản
          </Button>
          <Button
            type="submit"
            form="delete-account-form"
            variant="danger"
            loading={isSubmitting}
            disabled={!isConfirmWord(confirmText)}
          >
            {isSubmitting ? 'Đang xóa…' : 'Xóa vĩnh viễn'}
          </Button>
        </>
      }
    >
      <form id="delete-account-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formError} />
        <PasswordInput
          label="Mật khẩu"
          autoComplete="current-password"
          data-autofocus
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label={`Gõ ${DELETE_CONFIRM_WORD} để xác nhận`}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          error={errors.confirm?.message}
          {...register('confirm')}
        />
      </form>
    </Modal>
  );
}
