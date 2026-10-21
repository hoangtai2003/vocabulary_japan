import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/renderApp';

async function openRegister() {
  const user = userEvent.setup();
  const utils = renderApp('/dang-ky');
  await screen.findByRole('heading', { name: 'Tạo tài khoản' });
  return { user, ...utils };
}

async function fill(user: ReturnType<typeof userEvent.setup>, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    if (value) await user.type(screen.getByLabelText(label), value);
  }
}

describe('RegisterPage', () => {
  it('validate tên, mật khẩu ngắn và mật khẩu nhập lại không khớp', async () => {
    const { user } = await openRegister();
    await fill(user, {
      'Tên hiển thị': 'A',
      Email: 'moi@example.com',
      'Mật khẩu': '123',
      'Nhập lại mật khẩu': '456',
    });
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(await screen.findByText('Tên hiển thị cần ít nhất 2 ký tự')).toBeInTheDocument();
    expect(screen.getByText('Mật khẩu cần ít nhất 6 ký tự')).toBeInTheDocument();
    expect(screen.getByText('Mật khẩu nhập lại không khớp')).toBeInTheDocument();
  });

  it('email đã đăng ký: lỗi EMAIL_TAKEN hiển thị dưới ô email', async () => {
    const { user } = await openRegister();
    await fill(user, {
      'Tên hiển thị': 'Bạn mới',
      Email: 'user@example.com',
      'Mật khẩu': '123456',
      'Nhập lại mật khẩu': '123456',
    });
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(await screen.findByText('Email này đã được đăng ký')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('đăng ký thành công thì vào trang Hôm nay', async () => {
    const { user, router } = await openRegister();
    await fill(user, {
      'Tên hiển thị': 'Bạn mới',
      Email: 'moi@example.com',
      'Mật khẩu': '123456',
      'Nhập lại mật khẩu': '123456',
    });
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});
