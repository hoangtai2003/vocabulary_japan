import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp, SAMPLE_USER_ID } from '@/test/renderApp';

async function openProfile() {
  const user = userEvent.setup();
  const utils = renderApp('/ho-so', { as: SAMPLE_USER_ID });
  await screen.findByRole('heading', { name: 'Hồ sơ', level: 1 });
  return { user, ...utils };
}

describe('ProfilePage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  it('đổi tên hiển thị: nút lưu chỉ bật khi đã sửa, lỗi zod hiện dưới trường', async () => {
    const { user } = await openProfile();
    const input = screen.getByRole('textbox', { name: 'Tên hiển thị' });
    const save = screen.getByRole('button', { name: 'Lưu tên' });
    expect(save).toBeDisabled();

    await user.clear(input);
    await user.type(input, 'A');
    await user.click(save);
    expect(await screen.findByText('Tên hiển thị cần ít nhất 2 ký tự')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'Hana');
    await user.click(save);
    expect(await screen.findByText('Đã đổi tên thành Hana')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Tên hiển thị' })).toHaveValue('Hana'),
    );
  });

  it('cài đặt học lưu ngay khi chọn, kèm toast; giao diện tối áp ngay', async () => {
    const { user, queryClient } = await openProfile();
    const goal = screen.getByRole('group', { name: 'Số từ mới mỗi ngày' });
    await user.click(within(goal).getByRole('radio', { name: /20 từ/ }));
    expect(within(goal).getByRole('radio', { name: /20 từ/ })).toBeChecked();
    expect(await screen.findByText('Đã đặt mục tiêu 20 từ mới mỗi ngày.')).toBeInTheDocument();

    const theme = screen.getByRole('group', { name: 'Giao diện' });
    await user.click(within(theme).getByRole('radio', { name: 'Tối' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(await screen.findByText('Đã đổi giao diện: Tối.')).toBeInTheDocument();

    const me = queryClient.getQueryData<{ settings: { daily_goal: number; theme: string } }>([
      'auth',
      'me',
    ]);
    expect(me?.settings).toMatchObject({ daily_goal: 20, theme: 'dark' });
  });

  it('đổi mật khẩu: sai mật khẩu hiện tại báo dưới trường, đúng thì xóa trắng form', async () => {
    const { user } = await openProfile();
    const current = screen.getByLabelText('Mật khẩu hiện tại');
    const next = screen.getByLabelText('Mật khẩu mới');
    const confirm = screen.getByLabelText('Nhập lại mật khẩu mới');
    const submit = screen.getByRole('button', { name: 'Đổi mật khẩu' });

    await user.type(current, 'sai-mat-khau');
    await user.type(next, 'matkhaumoi');
    await user.type(confirm, 'khac');
    await user.click(submit);
    expect(await screen.findByText('Mật khẩu nhập lại không khớp')).toBeInTheDocument();

    await user.clear(confirm);
    await user.type(confirm, 'matkhaumoi');
    await user.click(submit);
    expect(await screen.findByText('Mật khẩu không đúng')).toBeInTheDocument();

    await user.clear(current);
    await user.type(current, '123456');
    await user.click(submit);
    expect(await screen.findByText(/Đã đổi mật khẩu/)).toBeInTheDocument();
    expect(current).toHaveValue('');
  });

  it('xóa tài khoản: cần gõ XÓA và đúng mật khẩu, thành công thì về trang đăng nhập', async () => {
    const { user, router } = await openProfile();
    await user.click(screen.getByRole('button', { name: 'Xóa tài khoản' }));
    const dialog = screen.getByRole('dialog', { name: 'Xóa tài khoản?' });
    const submit = within(dialog).getByRole('button', { name: 'Xóa vĩnh viễn' });
    expect(within(dialog).getByLabelText('Mật khẩu')).toHaveFocus();
    expect(submit).toBeDisabled();

    await user.type(within(dialog).getByLabelText('Mật khẩu'), 'sai');
    await user.type(within(dialog).getByLabelText('Gõ XÓA để xác nhận'), 'xóa');
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(await within(dialog).findByText('Mật khẩu không đúng')).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Mật khẩu'));
    await user.type(within(dialog).getByLabelText('Mật khẩu'), '123456');
    await user.click(submit);
    await waitFor(() => expect(router.state.location.pathname).toBe('/dang-nhap'));
    expect(await screen.findByText(/Đã xóa tài khoản/)).toBeInTheDocument();
  });

  it('chế độ mock có nút ẩn đặt lại dữ liệu mẫu', async () => {
    const { user } = await openProfile();
    await user.click(screen.getByText('Công cụ chế độ thử nghiệm'));
    await user.click(screen.getByRole('button', { name: 'Đặt lại dữ liệu mẫu' }));
    const dialog = screen.getByRole('dialog', { name: 'Đặt lại dữ liệu mẫu?' });
    await user.click(within(dialog).getByRole('button', { name: 'Đặt lại' }));
    expect(await screen.findByText('Đã đặt lại dữ liệu mẫu.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
