import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp, SAMPLE_ADMIN_ID, SAMPLE_USER_ID } from '@/test/renderApp';

describe('điều hướng và phân quyền', () => {
  it('đang chờ /auth/me thì hiện màn hình chờ, không nháy sang đăng nhập', async () => {
    renderApp('/tu-vung');
    expect(screen.getByRole('status')).toHaveTextContent('Đang mở sổ');
    await screen.findByRole('heading', { name: 'Đăng nhập' });
  });

  it('chưa đăng nhập: chuyển về /dang-nhap?next=<đường dẫn hiện tại>', async () => {
    const { router } = renderApp('/tu-vung?level=N5');
    await screen.findByRole('heading', { name: 'Đăng nhập' });
    expect(router.state.location.pathname).toBe('/dang-nhap');
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/tu-vung?level=N5')}`);
  });

  it('đã đăng nhập mà vào /dang-nhap thì về /', async () => {
    const { router } = renderApp('/dang-nhap', { as: SAMPLE_USER_ID });
    await screen.findByRole('heading', { name: 'Chào Minh Anh', level: 1 });
    expect(router.state.location.pathname).toBe('/');
  });

  it('người dùng thường mở /quan-tri thấy trang 403 có nút về Hôm nay', async () => {
    renderApp('/quan-tri', { as: SAMPLE_USER_ID });
    await screen.findByRole('heading', { name: 'Trang này dành cho quản trị viên' });
    expect(screen.getByRole('link', { name: 'Về Hôm nay' })).toHaveAttribute('href', '/');
    expect(screen.queryAllByRole('link', { name: /Quản trị/ })).toHaveLength(0);
  });

  it('admin mở được /quan-tri và thấy mục Quản trị trong điều hướng', async () => {
    renderApp('/quan-tri', { as: SAMPLE_ADMIN_ID });
    await screen.findByRole('heading', { name: 'Quản trị', level: 1 });
    expect(screen.getAllByRole('link', { name: /Quản trị/ }).length).toBeGreaterThan(0);
  });

  it('đường dẫn không tồn tại → 404', async () => {
    renderApp('/khong-co-trang-nay');
    await screen.findByRole('heading', { name: 'Không có trang này' });
  });

  it('tab Ôn tập có huy hiệu số thẻ cần ôn', async () => {
    renderApp('/', { as: SAMPLE_USER_ID });
    await waitFor(() => expect(screen.getAllByLabelText('8 thẻ cần ôn').length).toBeGreaterThan(0));
  });
});
