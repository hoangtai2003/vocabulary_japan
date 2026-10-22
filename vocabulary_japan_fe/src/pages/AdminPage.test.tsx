import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp, SAMPLE_ADMIN_ID, SAMPLE_USER_ID } from '@/test/renderApp';

async function openAdmin() {
  const user = userEvent.setup();
  const utils = renderApp('/quan-tri', { as: SAMPLE_ADMIN_ID });
  await screen.findByRole('heading', { name: 'Quản trị', level: 1 });
  await screen.findByText('1–20 trong 416 từ');
  return { user, ...utils };
}

const table = () => screen.getByRole('table', { name: /Danh sách từ vựng/ });
const bodyRows = () => within(table()).getAllByRole('row').slice(1);

describe('AdminPage', () => {
  afterEach(() => vi.clearAllMocks());

  it('người dùng thường thấy trang 403', async () => {
    renderApp('/quan-tri', { as: SAMPLE_USER_ID });
    expect(await screen.findByRole('link', { name: /Về Hôm nay/ })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('bảng có phân trang và sắp xếp theo cột', async () => {
    const { user } = await openAdmin();
    expect(bodyRows()).toHaveLength(20);
    expect(within(bodyRows()[0]!).getAllByRole('cell')[0]).toHaveTextContent('w001');

    await user.click(screen.getByRole('button', { name: 'Sau' }));
    expect(await screen.findByText('21–40 trong 416 từ')).toBeInTheDocument();

    const idHeader = screen.getByRole('columnheader', { name: /ID/ });
    expect(idHeader).toHaveAttribute('aria-sort', 'ascending');
    await user.click(within(idHeader).getByRole('button'));
    expect(idHeader).toHaveAttribute('aria-sort', 'descending');
    // Đổi sắp xếp thì về trang 1.
    expect(await screen.findByText('1–20 trong 416 từ')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(bodyRows()[0]!).getAllByRole('cell')[0]).toHaveTextContent('w416'),
    );
  });

  it('tìm kiếm và lọc theo cấp độ', async () => {
    const { user } = await openAdmin();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Cấp độ' }), 'N4');
    expect(await screen.findByText('1–20 trong 317 từ')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Tìm từ' }), 'khong co tu nay');
    expect(
      await screen.findByRole('heading', { name: 'Không có từ nào khớp' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    expect(await screen.findByText('1–20 trong 416 từ')).toBeInTheDocument();
  });

  it('thêm từ: lỗi theo trường từ schema, hợp lệ thì lưu và đóng modal', async () => {
    const { user } = await openAdmin();
    await user.click(screen.getByRole('button', { name: 'Thêm từ' }));
    const dialog = screen.getByRole('dialog', { name: 'Thêm từ' });
    const submit = within(dialog).getByRole('button', { name: 'Thêm từ' });

    await user.type(within(dialog).getByLabelText('Cách đọc (kana)'), 'abc');
    await user.click(submit);
    expect(
      await within(dialog).findByText('Cách đọc chỉ gồm hiragana hoặc katakana'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Nhập ít nhất một nghĩa')).toBeInTheDocument();

    const field = (label: string) => within(dialog).getByLabelText(label);
    await user.clear(field('Cách đọc (kana)'));
    await user.type(field('Cách đọc (kana)'), 'ぺん');
    await user.type(field('Romaji'), 'Pen');
    await user.type(field('Nghĩa tiếng Việt'), 'cây bút{Enter}{Enter}bút mực');
    await user.type(field('Câu ví dụ'), 'ぺんがあります。');
    await user.type(field('Câu ví dụ bằng kana'), 'ぺんがあります。');
    await user.type(field('Câu ví dụ bằng romaji'), 'pen ga arimasu.');
    await user.type(field('Nghĩa câu ví dụ'), 'Có cây bút.');
    await user.click(submit);

    expect(await screen.findByText('Đã thêm ぺん.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('1–20 trong 417 từ')).toBeInTheDocument();
  });

  it('sửa từ mở modal điền sẵn dữ liệu', async () => {
    const { user } = await openAdmin();
    const first = bodyRows()[0]!;
    const kana = within(first).getAllByRole('cell')[1]!.textContent ?? '';
    await user.click(within(first).getByRole('button', { name: /^Sửa / }));
    const dialog = screen.getByRole('dialog', { name: /^Sửa từ/ });
    expect(kana).toContain(
      (within(dialog).getByLabelText('Cách đọc (kana)') as HTMLInputElement).value,
    );
    expect(within(dialog).getByLabelText('Nghĩa tiếng Việt')).not.toHaveValue('');
  });

  it('xóa từ cần xác nhận', async () => {
    const { user } = await openAdmin();
    await user.click(within(bodyRows()[0]!).getByRole('button', { name: /^Xóa / }));
    const dialog = screen.getByRole('dialog', { name: 'Xóa từ này?' });
    await user.click(within(dialog).getByRole('button', { name: 'Xóa từ' }));
    expect(await screen.findByText('1–20 trong 415 từ')).toBeInTheDocument();
    expect(within(bodyRows()[0]!).getAllByRole('cell')[0]).toHaveTextContent('w002');
  });
});
