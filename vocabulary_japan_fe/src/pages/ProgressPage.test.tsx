import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import type * as Recharts from 'recharts';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/mock/server';
import { renderApp, SAMPLE_ADMIN_ID, SAMPLE_USER_ID } from '@/test/renderApp';
import { addDays, toDateKey } from '@/utils/dates';
import { formatLongDate } from '@/utils/format';

// jsdom không đo được bố cục: cho biểu đồ kích thước cố định thay vì ResponsiveContainer.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof Recharts>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) =>
      isValidElement(children)
        ? cloneElement(children as ReactElement<{ width: number; height: number }>, {
            width: 600,
            height: 240,
          })
        : null,
  };
});

async function openProgress(as = SAMPLE_USER_ID) {
  const user = userEvent.setup();
  const utils = renderApp('/tien-do', { as });
  await screen.findByRole('heading', { name: 'Tiến độ', level: 1 });
  return { user, ...utils };
}

const stat = (label: string) => screen.getByText(label).closest('div')!;

describe('ProgressPage', () => {
  it('bốn chỉ số của tài khoản mẫu', async () => {
    await openProgress();
    await screen.findByText('Streak hiện tại');
    expect(stat('Streak hiện tại')).toHaveTextContent('4ngày');
    expect(stat('Từ đã học')).toHaveTextContent('25từ');
    expect(Number(stat('Streak dài nhất').textContent?.match(/\d+/)?.[0])).toBeGreaterThanOrEqual(
      4,
    );
  });

  it('biểu đồ 8 tuần có chú giải và bảng số liệu thay thế', async () => {
    const { user } = await openProgress();
    // Chờ chú giải (biểu đồ thật) chứ không phải tiêu đề, vì khung skeleton cũng có tiêu đề này.
    // findByRole quét cả DOM lớn (182 ô heatmap + SVG) nên chậm; tìm theo nhãn nhanh hơn.
    const legend = await screen.findByLabelText('Chú giải', {}, { timeout: 3000 });
    const chart = legend.closest('section')!;
    // Đọc biểu đồ trước khi chuyển sang dạng bảng (biểu đồ sẽ được thay bằng bảng).
    const barsDrawn = chart.querySelectorAll('.recharts-bar-rectangle').length;
    const labels = [...chart.querySelectorAll('.recharts-label-list text')].map(
      (t) => t.textContent,
    );
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Từ mới', 'Lượt ôn']);

    await user.click(within(chart).getByRole('button', { name: 'Xem dạng bảng' }));
    const rows = within(within(chart).getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(8);
    const newTotal = rows.reduce(
      (sum, row) => sum + Number(within(row).getAllByRole('cell')[0]!.textContent),
      0,
    );
    expect(newTotal).toBe(25);
    // Biểu đồ được vẽ thật: mỗi giá trị khác 0 trong bảng là một cột (Recharts bỏ cột cao 0).
    const nonZero = rows
      .flatMap((row) => within(row).getAllByRole('cell'))
      .filter((cell) => cell.textContent !== '0').length;
    expect(barsDrawn).toBe(nonZero);
    expect(barsDrawn).toBeGreaterThan(0);
    // Nhãn trực tiếp chỉ ở tuần mới nhất: tối đa 2 số (từ mới, lượt ôn).
    const lastRow = within(rows[rows.length - 1]!)
      .getAllByRole('cell')
      .map((c) => c.textContent);
    expect(labels).toEqual(lastRow.filter((v) => v !== '0'));
    expect(within(chart).getByRole('button', { name: 'Xem biểu đồ' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('heatmap: mỗi ô có aria-label ngày và số lượt; phím mũi tên di chuyển theo tuần', async () => {
    const { user } = await openProgress();
    const grid = await screen.findByRole('grid', { name: /Lịch học/ });
    const cells = within(grid).getAllByRole('gridcell');
    expect(cells.filter((c) => /lượt học$/.test(c.getAttribute('aria-label') ?? ''))).toHaveLength(
      20,
    );
    expect(screen.getByText('Bạn đã học 20 ngày trong 6 tháng qua.')).toBeInTheDocument();

    const today = new Date();
    const todayCell = cells.find((c) => c.getAttribute('tabindex') === '0')!;
    expect(todayCell).toHaveAttribute(
      'aria-label',
      `${formatLongDate(toDateKey(today))}: không học`,
    );

    todayCell.focus();
    await user.keyboard('{ArrowLeft}');
    const weekAgo = toDateKey(addDays(today, -7));
    expect(document.activeElement).toHaveAttribute('data-date', weekAgo);
    expect(document.activeElement).toHaveAttribute('tabindex', '0');
  });

  it('chưa học gì: chỉ số bằng 0 và trạng thái rỗng gợi ý bắt đầu học', async () => {
    await openProgress(SAMPLE_ADMIN_ID);
    expect(await screen.findByRole('heading', { name: 'Chưa có gì để vẽ' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bắt đầu học' })).toHaveAttribute('href', '/hoc');
    expect(stat('Từ đã học')).toHaveTextContent('0từ');
  });

  it('một khối lỗi không làm hỏng cả trang, thử lại được', async () => {
    let fail = true;
    server.use(
      http.get('*/api/stats/overview', () =>
        fail
          ? HttpResponse.json(
              { error: { code: 'INTERNAL_ERROR', message: 'Lỗi' } },
              { status: 500 },
            )
          : undefined,
      ),
    );
    const { user } = await openProgress();
    expect(await screen.findByText('Chưa tải được các chỉ số')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '8 tuần gần nhất' })).toBeInTheDocument();

    fail = false;
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Streak hiện tại')).toBeInTheDocument();
  });
});
