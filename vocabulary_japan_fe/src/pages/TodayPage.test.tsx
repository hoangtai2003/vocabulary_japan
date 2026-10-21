import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { meApi } from '@/api/meApi';
import { reviewApi } from '@/api/reviewApi';
import { wordsApi } from '@/api/wordsApi';
import { setSessionUserId } from '@/mock/db';
import { server } from '@/mock/server';
import { renderApp, SAMPLE_ADMIN_ID, SAMPLE_USER_ID } from '@/test/renderApp';

describe('TodayPage', () => {
  it('đang tải hiển thị skeleton', async () => {
    renderApp('/', { as: SAMPLE_USER_ID });
    expect(
      await screen.findByRole('status', { name: 'Đang tải trang Hôm nay' }),
    ).toBeInTheDocument();
  });

  it('tài khoản mẫu: lời chào, streak, tiến độ, cần ôn, danh sách 10 từ', async () => {
    renderApp('/', { as: SAMPLE_USER_ID });
    await screen.findByRole('heading', { name: 'Chào Minh Anh' });

    expect(
      await screen.findByText('Bạn đã học 4 ngày liền. Học hôm nay để giữ chuỗi nhé.'),
    ).toBeInTheDocument();
    const progress = screen.getByRole('progressbar', { name: 'Tiến độ hôm nay' });
    expect(progress).toHaveAttribute('aria-valuenow', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '10');
    expect(screen.getByRole('link', { name: 'Bắt đầu học' })).toHaveAttribute('href', '/hoc');
    expect(await screen.findByRole('link', { name: /Bạn còn 8 từ cần ôn/ })).toHaveAttribute(
      'href',
      '/on-tap',
    );

    const list = screen.getByRole('heading', { name: 'Danh sách hôm nay' }).closest('section')!;
    expect(within(list).getAllByRole('listitem')).toHaveLength(10);
    expect(within(list).queryAllByRole('img', { name: 'Đã học' })).toHaveLength(0);
  });

  it('học xong mục tiêu: đánh dấu đã học, nút chính chuyển sang Ôn tập', async () => {
    setSessionUserId(SAMPLE_USER_ID);
    const { new_words } = await wordsApi.today();
    for (const word of new_words) await reviewApi.grade(word.id, 4);

    renderApp('/', { as: SAMPLE_USER_ID });
    expect(await screen.findByText('Bạn đã học xong từ mới hôm nay.')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Đã học' })).toHaveLength(10);
    expect(await screen.findByRole('link', { name: 'Ôn tập 8 từ' })).toHaveAttribute(
      'href',
      '/on-tap',
    );
    expect(await screen.findByText('Bạn đã học 5 ngày liền.')).toBeInTheDocument();
  });

  it('chưa học từ nào: không có gì để ôn, gợi ý học từ mới', async () => {
    renderApp('/', { as: SAMPLE_ADMIN_ID });
    expect(
      await screen.findByText('Chưa có từ nào cần ôn. Học vài từ mới, lịch ôn sẽ tự đến.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Học một thẻ hôm nay để bắt đầu chuỗi ngày học mới.'),
    ).toBeInTheDocument();
  });

  it('đã ôn hết thẻ đến hạn: báo đã ôn xong', async () => {
    setSessionUserId(SAMPLE_USER_ID);
    const due = await reviewApi.due();
    for (const word of due.items) await reviewApi.grade(word.id, 4);

    renderApp('/', { as: SAMPLE_USER_ID });
    expect(await screen.findByText('Bạn đã ôn xong.')).toBeInTheDocument();
  });

  it('không còn từ mới ở cấp độ đang chọn: trạng thái rỗng gợi ý đổi cấp độ', async () => {
    setSessionUserId(SAMPLE_ADMIN_ID);
    await meApi.updateSettings({ level: 'N3' });

    renderApp('/', { as: SAMPLE_ADMIN_ID });
    expect(
      await screen.findByRole('heading', { name: 'Bạn đã học hết từ N3' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đổi cấp độ' })).toHaveAttribute('href', '/ho-so');
  });

  it('lỗi tải dữ liệu: hiển thị lỗi và thử lại được', async () => {
    let fail = true;
    server.use(
      http.get('*/api/words/today', () =>
        fail
          ? HttpResponse.json(
              { error: { code: 'INTERNAL_ERROR', message: 'Lỗi' } },
              { status: 500 },
            )
          : undefined,
      ),
    );
    const user = userEvent.setup();
    renderApp('/', { as: SAMPLE_USER_ID });

    expect(await screen.findByText('Chưa tải được bài học hôm nay')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('heading', { name: 'Chào Minh Anh' })).toBeInTheDocument();
  });
});
