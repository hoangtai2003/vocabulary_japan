import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp, SAMPLE_USER_ID } from '@/test/renderApp';

async function startQuiz(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: 'Quiz' });
  await user.click(screen.getByRole('button', { name: 'Bắt đầu' }));
  await screen.findByText('Câu 1/10');
}

describe('QuizPage', () => {
  it('cấu hình mặc định theo cấp độ của người dùng', async () => {
    renderApp('/quiz', { as: SAMPLE_USER_ID });
    await screen.findByRole('heading', { name: 'Quiz' });
    expect(screen.getByRole('radio', { name: /Nhật → Việt/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: '10 câu' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'N5' })).toBeChecked();
  });

  it('cấp độ chưa có từ: báo lỗi dưới mục Cấp độ', async () => {
    const user = userEvent.setup();
    renderApp('/quiz', { as: SAMPLE_USER_ID });
    await screen.findByRole('heading', { name: 'Quiz' });
    await user.click(screen.getByRole('radio', { name: 'N3' }));
    await user.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(await screen.findByText('Cấp độ N3 chưa đủ từ để làm quiz')).toBeInTheDocument();
  });

  it('làm hết 10 câu bằng bàn phím, xem kết quả, làm lại cùng cấu hình', async () => {
    const user = userEvent.setup();
    renderApp('/quiz', { as: SAMPLE_USER_ID });
    await startQuiz(user);

    for (let i = 1; i <= 10; i += 1) {
      await screen.findByText(`Câu ${i}/10`);
      await user.keyboard('1');
      await user.keyboard('{Enter}');
    }
    const heading = await screen.findByRole('heading', { name: /^Bạn đúng \d+\/10 câu$/ });
    const correct = Number(/đúng (\d+)\//.exec(heading.textContent ?? '')?.[1]);
    if (correct < 10) {
      const wrongList = screen.getByRole('heading', { name: 'Câu sai' }).closest('section')!;
      expect(within(wrongList).getAllByRole('listitem')).toHaveLength(10 - correct);
    }

    await user.click(screen.getByRole('button', { name: 'Làm lại' }));
    expect(await screen.findByText('Câu 1/10')).toBeInTheDocument();
  });

  it('rời trang giữa chừng thì hỏi xác nhận', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/quiz', { as: SAMPLE_USER_ID });
    await startQuiz(user);
    await user.keyboard('1');

    await user.click(screen.getAllByRole('link', { name: /Hôm nay/ })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Rời bài quiz?' });
    expect(dialog).toHaveTextContent('Bạn đã trả lời 1/10 câu.');
    expect(router.state.location.pathname).toBe('/quiz');

    await user.click(within(dialog).getByRole('button', { name: 'Ở lại làm tiếp' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Câu 1/10')).toBeInTheDocument();

    await user.click(screen.getAllByRole('link', { name: /Hôm nay/ })[0]!);
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Rời trang' }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});
