import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mock/server';
import { renderApp, SAMPLE_USER_ID } from '@/test/renderApp';

const list = () => screen.getByRole('region', { name: 'Danh sách từ' }).querySelector('ul')!;
const rows = () => within(list()).getAllByRole('listitem');

async function openWords(path = '/tu-vung') {
  const user = userEvent.setup();
  const utils = renderApp(path, { as: SAMPLE_USER_ID });
  await screen.findByRole('heading', { name: 'Từ vựng' });
  return { user, ...utils };
}

describe('WordsPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('hiện trang đầu 20 từ, bấm "Tải thêm từ" để tải tiếp', async () => {
    const { user } = await openWords();
    expect(await screen.findByText('416 từ')).toBeInTheDocument();
    expect(rows()).toHaveLength(20);

    await user.click(screen.getByRole('button', { name: 'Tải thêm từ' }));
    await waitFor(() => expect(rows()).toHaveLength(40));
  });

  it('tìm kiếm không dấu sau 300 ms, ghi lên URL', async () => {
    const { user, router } = await openWords();
    await screen.findByText('416 từ');
    await user.type(screen.getByRole('searchbox', { name: 'Tìm từ' }), 'truong hoc');

    await waitFor(() =>
      expect(new URLSearchParams(router.state.location.search).get('q')).toBe('truong hoc'),
    );
    await waitFor(() => expect(screen.getByText('がっこう')).toBeInTheDocument());
    expect(rows().length).toBeLessThan(5);
  });

  it('đọc bộ lọc từ URL: cấp độ và chỉ yêu thích', async () => {
    await openWords('/tu-vung?level=N4');
    expect(await screen.findByText('317 từ')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Cấp độ' })).toHaveValue('N4');
  });

  it('lọc chỉ yêu thích bằng nút bật/tắt', async () => {
    const { user, router } = await openWords();
    await screen.findByText('416 từ');
    await user.click(screen.getByRole('button', { name: 'Chỉ yêu thích' }));
    expect(router.state.location.search).toContain('fav=1');
    expect(await screen.findByText('4 từ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chỉ yêu thích' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('yêu thích cập nhật ngay (optimistic)', async () => {
    const { user } = await openWords('/tu-vung?level=N4');
    await screen.findByText('317 từ');
    const star = within(rows()[0]!).getByRole('button', { name: /^Yêu thích/ });
    expect(star).toHaveAttribute('aria-pressed', 'false');
    await user.click(star);
    expect(star).toHaveAttribute('aria-pressed', 'true');
  });

  it('không có kết quả: trạng thái rỗng, xóa bộ lọc để xem lại tất cả', async () => {
    const { user } = await openWords('/tu-vung?q=khongcotunay');
    expect(
      await screen.findByRole('heading', { name: 'Không có từ nào khớp' }),
    ).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Xóa bộ lọc' })[0]!);
    expect(await screen.findByText('416 từ')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Tìm từ' })).toHaveValue('');
  });

  it('điện thoại: bấm từ mở drawer, ghi chú tự lưu, Esc đóng', async () => {
    const { user, router } = await openWords('/tu-vung?q=gakkou');
    await user.click(await screen.findByRole('button', { name: /^学校/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Chi tiết từ' });
    expect(router.state.location.search).toContain('tu=w');
    expect(within(dialog).getByText('trường học')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Ghi chú của bạn'), 'Nhớ: 学 là học');
    expect(await within(dialog).findByText('Đã lưu', {}, { timeout: 3000 })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.search).not.toContain('tu=');

    // Ghi chú đã lưu thật: mở lại thấy nội dung cũ.
    await user.click(screen.getByRole('button', { name: /^学校/ }));
    expect(await screen.findByLabelText('Ghi chú của bạn')).toHaveValue('Nhớ: 学 là học');
  });

  it('desktop: panel bên phải, mở thẳng từ link ?tu=', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query === '(min-width: 1024px)',
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );
    await openWords('/tu-vung?tu=w055');
    const panel = await screen.findByRole('region', { name: 'Chi tiết từ' });
    expect(await within(panel).findByText('学校')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lỗi tải danh sách: hiện lỗi và thử lại', async () => {
    let fail = true;
    server.use(
      http.get('*/api/words', () =>
        fail
          ? HttpResponse.json(
              { error: { code: 'INTERNAL_ERROR', message: 'Lỗi' } },
              { status: 500 },
            )
          : undefined,
      ),
    );
    const { user } = await openWords();
    expect(await screen.findByText('Chưa tải được danh sách từ')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('416 từ')).toBeInTheDocument();
  });
});
