import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp, SAMPLE_ADMIN_ID, SAMPLE_USER_ID } from '@/test/renderApp';
import { downloadBlob } from '@/utils/download';
import { sampleWordsCsv } from '@/utils/wordCsv';

vi.mock('@/utils/download', () => ({ downloadJson: vi.fn(), downloadBlob: vi.fn() }));

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

  it('nhập CSV: dry run xem trước, dòng lỗi tô đỏ, bấm Nhập mới ghi', async () => {
    const { user } = await openAdmin();
    await user.click(screen.getByRole('button', { name: 'Nhập file' }));
    const dialog = screen.getByRole('dialog', { name: 'Nhập từ từ file' });

    await user.click(within(dialog).getByRole('button', { name: 'Tải file CSV mẫu' }));
    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'tu-vung-mau.csv');

    const valid = sampleWordsCsv()
      .trim()
      .split('\r\n')[1]!
      .replace('学校', '鉛筆削り')
      .replace('がっこう', 'えんぴつけずり');
    const invalid = 'x,abc,abc,,noun,N9,t01,a,b,c,d';
    const content = [sampleWordsCsv().split('\r\n')[0], valid, invalid].join('\n');
    const file = new File([content], 'tu-moi.csv', { type: 'text/csv' });
    await user.upload(within(dialog).getByLabelText('Chọn file'), file);

    expect(await within(dialog).findByText('1 dòng hợp lệ')).toBeInTheDocument();
    const preview = within(dialog).getByRole('table', { name: 'Xem trước dữ liệu nhập' });
    const rows = within(preview).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Hợp lệ');
    expect(rows[1]).toHaveClass('bg-son-wash/60');
    expect(rows[1]).toHaveTextContent('Cách đọc chỉ gồm hiragana hoặc katakana');

    await user.click(within(dialog).getByRole('button', { name: 'Nhập 1 từ' }));
    expect(await screen.findByText('Đã nhập 1 từ, bỏ qua 1 dòng lỗi.')).toBeInTheDocument();
    expect(await screen.findByText('1–20 trong 417 từ')).toBeInTheDocument();
  });

  it('xuất CSV tải file về', async () => {
    const { user } = await openAdmin();
    await user.click(screen.getByRole('button', { name: 'Xuất CSV' }));
    expect(await screen.findByText('Đã xuất file CSV.')).toBeInTheDocument();
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(vi.mocked(downloadBlob).mock.calls[0]![1]).toMatch(/\.csv$/);
  });
});
