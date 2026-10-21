import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { QuizQuestion as QuizQuestionData } from '@/types/api';
import { QuizQuestion } from './QuizQuestion';

const question: QuizQuestionData = {
  id: 'q1',
  word_id: 'w054',
  prompt: '学校',
  prompt_sub: 'がっこう · gakkou',
  options: [
    { id: 'o1', text: 'bệnh viện' },
    { id: 'o2', text: 'trường học' },
    { id: 'o3', text: 'nhà ga' },
    { id: 'o4', text: 'công viên' },
  ],
  correct_option_id: 'o2',
};

function Harness({ onNext = vi.fn() }: { onNext?: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <QuizQuestion
      question={question}
      mode="jp_vi"
      index={0}
      total={10}
      selectedId={selected}
      onSelect={(id) => setSelected((current) => current ?? id)}
      onNext={onNext}
      nextLabel="Tiếp"
    />
  );
}

const option = (text: string) => screen.getByRole('button', { name: new RegExp(text) });

describe('QuizQuestion', () => {
  it('chưa chọn: không lộ cách đọc, chưa có nút Tiếp', () => {
    render(<Harness />);
    expect(screen.getByRole('heading', { name: /学校/ })).toBeInTheDocument();
    expect(screen.queryByText('がっこう · gakkou')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tiếp/ })).not.toBeInTheDocument();
  });

  it('chọn sai: tô sai đáp án đã chọn, tô đúng đáp án đúng, hiện cách đọc', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(option('bệnh viện'));

    expect(option('bệnh viện')).toHaveAttribute('data-state', 'wrong');
    expect(option('trường học')).toHaveAttribute('data-state', 'correct');
    expect(option('nhà ga')).toHaveAttribute('data-state', 'dimmed');
    expect(screen.getByRole('status')).toHaveTextContent('Chưa đúng. Đáp án: trường học');
    expect(screen.getByText('がっこう · gakkou')).toBeInTheDocument();
  });

  it('chọn đúng: chỉ đáp án đúng được tô, báo đúng rồi', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(option('trường học'));
    expect(option('trường học')).toHaveAttribute('data-state', 'correct');
    expect(screen.queryAllByRole('button').filter((b) => b.dataset.state === 'wrong')).toHaveLength(
      0,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi!');
  });

  it('khóa đáp án sau khi chọn: bấm hay gõ phím khác không đổi kết quả', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(option('bệnh viện'));
    for (const text of ['bệnh viện', 'trường học', 'nhà ga', 'công viên']) {
      expect(option(text)).toHaveAttribute('aria-disabled', 'true');
    }
    await user.click(option('trường học'));
    await user.keyboard('2');
    expect(option('bệnh viện')).toHaveAttribute('data-state', 'wrong');
    expect(screen.getByRole('status')).toHaveTextContent('Chưa đúng');
  });

  it('phím 1–4 chọn đáp án; Enter sang câu tiếp', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Harness onNext={onNext} />);
    await user.keyboard('3');
    expect(option('nhà ga')).toHaveAttribute('data-state', 'wrong');

    const next = screen.getByRole('button', { name: /Tiếp/ });
    expect(next).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onNext).toHaveBeenCalledOnce();
  });
});
