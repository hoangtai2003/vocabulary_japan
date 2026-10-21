import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/mock/server';
import { renderApp } from '@/test/renderApp';

async function openLogin(path = '/dang-nhap') {
  const user = userEvent.setup();
  const utils = renderApp(path);
  await screen.findByRole('heading', { name: 'Đăng nhập' });
  return { user, ...utils };
}

describe('LoginPage', () => {
  it('hiển thị lỗi zod dưới từng trường khi gửi form trống', async () => {
    const { user } = await openLogin();
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Nhập email')).toBeInTheDocument();
    expect(screen.getByText('Nhập mật khẩu')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('email sai định dạng', async () => {
    const { user } = await openLogin();
    await user.type(screen.getByLabelText('Email'), 'khong-phai-email');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByText('Email không hợp lệ')).toBeInTheDocument();
  });

  it('sai mật khẩu: lỗi INVALID_CREDENTIALS hiển thị ở đầu form', async () => {
    const { user } = await openLogin();
    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Mật khẩu'), 'sai-mat-khau');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    const alert = await screen.findByText('Email hoặc mật khẩu không đúng');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
  });

  it('lỗi theo trường từ API (fields) hiển thị dưới đúng trường', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Dữ liệu chưa hợp lệ',
              fields: { email: 'Email này đã bị khóa' },
            },
          },
          { status: 400 },
        ),
      ),
    );
    const { user } = await openLogin();
    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Mật khẩu'), '123456');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Email này đã bị khóa')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Dữ liệu chưa hợp lệ')).not.toBeInTheDocument();
  });

  it('nút gửi bị khóa trong lúc gửi', async () => {
    let release: () => void = () => undefined;
    server.use(
      http.post('*/api/auth/login', async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return HttpResponse.json(
          { error: { code: 'INVALID_CREDENTIALS', message: 'Sai' } },
          { status: 401 },
        );
      }),
    );
    const { user } = await openLogin();
    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Mật khẩu'), '123456');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    const submitting = await screen.findByRole('button', { name: /Đang đăng nhập/ });
    expect(submitting).toBeDisabled();
    expect(submitting).toHaveAttribute('aria-busy', 'true');
    release();
    await screen.findByText('Sai');
  });

  it('bấm tài khoản mẫu để điền sẵn, đăng nhập rồi về trang next', async () => {
    const { user, router } = await openLogin('/dang-nhap?next=%2Ftien-do');
    await user.click(screen.getByRole('button', { name: /Người học/ }));
    expect(screen.getByLabelText('Email')).toHaveValue('user@example.com');
    expect(screen.getByLabelText('Mật khẩu')).toHaveValue('123456');

    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/tien-do'));
  });

  it('next trỏ ra ngoài thì bị bỏ qua, về /', async () => {
    const { user, router } = await openLogin('/dang-nhap?next=%2F%2Fevil.com');
    await user.click(screen.getByRole('button', { name: /Người học/ }));
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('nút hiện/ẩn mật khẩu', async () => {
    const { user } = await openLogin();
    const input = screen.getByLabelText('Mật khẩu');
    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
