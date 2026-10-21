import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { reviewApi } from '@/api/reviewApi';
import { setSessionUserId } from '@/mock/db';
import { server } from '@/mock/server';
import { renderApp, SAMPLE_ADMIN_ID, SAMPLE_USER_ID } from '@/test/renderApp';

const position = () =>
  screen.getByRole('group', { name: /^Thẻ \d+ trên \d+/ }).getAttribute('aria-label');

async function flipAndGrade(user: ReturnType<typeof userEvent.setup>, key: string) {
  await user.keyboard(' ');
  await screen.findByRole('group', { name: 'Chấm mức nhớ' });
  await user.keyboard(key);
}

describe('/hoc', () => {
  it('học lần lượt từ mới, chấm bằng phím, tiến độ tăng', async () => {
    const user = userEvent.setup();
    renderApp('/hoc', { as: SAMPLE_USER_ID });
    await screen.findByRole('heading', { name: 'Học từ mới' });
    expect(position()).toBe('Thẻ 1 trên 10');

    await flipAndGrade(user, '3');
    await waitFor(() => expect(position()).toBe('Thẻ 2 trên 10'));
    expect(screen.getByRole('progressbar', { name: 'Tiến độ phiên' })).toHaveAttribute(
      'aria-valuenow',
      '1',
    );
  });

  it('chấm Dễ thì đóng dấu son lên thẻ', async () => {
    const user = userEvent.setup();
    renderApp('/hoc', { as: SAMPLE_USER_ID });
    await screen.findByRole('heading', { name: 'Học từ mới' });
    await flipAndGrade(user, '4');
    expect(await screen.findByRole('img', { name: 'Dễ' })).toBeInTheDocument();
    await waitFor(() => expect(position()).toBe('Thẻ 2 trên 10'), { timeout: 2000 });
  });

  it('lỗi mạng khi chấm: giữ thẻ, báo lỗi, chấm lại được', async () => {
    server.use(http.post('*/api/reviews/:wordId', () => HttpResponse.error()));
    const user = userEvent.setup();
    renderApp('/hoc', { as: SAMPLE_USER_ID });
    await screen.findByRole('heading', { name: 'Học từ mới' });

    await flipAndGrade(user, '3');
    expect(await screen.findByText(/Chưa lưu được kết quả/)).toBeInTheDocument();
    expect(position()).toBe('Thẻ 1 trên 10');
    expect(screen.getByRole('group', { name: 'Chấm mức nhớ' })).toBeInTheDocument();

    server.resetHandlers();
    await user.keyboard('3');
    await waitFor(() => expect(position()).toBe('Thẻ 2 trên 10'));
    expect(screen.queryByText(/Chưa lưu được kết quả/)).not.toBeInTheDocument();
  });

  it('đã học hết từ mới hôm nay: trạng thái rỗng gợi ý ôn tập', async () => {
    setSessionUserId(SAMPLE_ADMIN_ID);
    const { wordsApi } = await import('@/api/wordsApi');
    const today = await wordsApi.today();
    for (const w of today.new_words) await reviewApi.grade(w.id, 4);

    renderApp('/hoc', { as: SAMPLE_ADMIN_ID });
    expect(
      await screen.findByRole('heading', { name: 'Bạn đã học xong từ mới hôm nay' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sang Ôn tập' })).toHaveAttribute('href', '/on-tap');
  });
});

describe('/on-tap', () => {
  it('thẻ Quên quay lại cuối hàng một lần, rồi tổng kết', async () => {
    const user = userEvent.setup();
    renderApp('/on-tap', { as: SAMPLE_USER_ID });
    await screen.findByRole('heading', { name: 'Ôn tập' });
    expect(position()).toBe('Thẻ 1 trên 8');

    await flipAndGrade(user, '1');
    await waitFor(() => expect(position()).toBe('Thẻ 1 trên 8'));
    for (let i = 0; i < 7; i += 1) {
      await flipAndGrade(user, '3');
      await waitFor(() => expect(position()).not.toBe(`Thẻ ${i + 1} trên 8`));
    }
    expect(position()).toBe('Thẻ 8 trên 8, ôn lại');
    expect(screen.getByText('Thẻ này quay lại vì bạn chọn "Quên".')).toBeInTheDocument();

    // Quên lần nữa: không quay lại thêm, phiên kết thúc.
    await flipAndGrade(user, '1');
    expect(await screen.findByRole('heading', { name: 'Xong lượt ôn' })).toBeInTheDocument();
    expect(screen.getByText('Bạn vừa ôn 8 từ.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về Hôm nay' })).toHaveAttribute('href', '/');
  });

  it('không có thẻ đến hạn: báo lần ôn tiếp theo và gợi ý học từ mới', async () => {
    setSessionUserId(SAMPLE_USER_ID);
    const due = await reviewApi.due();
    for (const w of due.items) await reviewApi.grade(w.id, 4);

    renderApp('/on-tap', { as: SAMPLE_USER_ID });
    expect(
      await screen.findByRole('heading', { name: 'Chưa có từ nào đến hạn' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/^Lần ôn tiếp theo: .+\. Học thêm từ mới trong lúc chờ nhé\?$/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Học từ mới' })).toHaveAttribute('href', '/hoc');
  });

  it('tài khoản chưa học gì: chưa có lịch ôn', async () => {
    renderApp('/on-tap', { as: SAMPLE_ADMIN_ID });
    expect(
      await screen.findByText('Bạn chưa có từ nào trong lịch ôn. Học vài từ mới để bắt đầu.'),
    ).toBeInTheDocument();
  });
});
