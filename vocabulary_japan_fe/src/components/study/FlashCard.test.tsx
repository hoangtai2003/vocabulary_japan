import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { makeWord } from '@/test/fixtures';
import type { Quality } from '@/types/api';
import { FlashCard } from './FlashCard';

const word = makeWord('w1', {
  kanji: '学校',
  kana: 'がっこう',
  romaji: 'gakkou',
  meanings_vi: ['trường học'],
});

function Harness({
  onGrade,
  showFurigana = true,
}: {
  onGrade: (q: Quality) => void;
  showFurigana?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  return (
    <FlashCard
      word={word}
      flipped={flipped}
      onFlip={() => setFlipped((f) => !f)}
      onGrade={onGrade}
      showFurigana={showFurigana}
      topicName="Trường học"
    />
  );
}

const card = () => screen.getByTestId('flashcard');
const isFlipped = () => card().getAttribute('data-flipped') === 'true';
const gradeGroup = () => screen.queryByRole('group', { name: 'Chấm mức nhớ' });

describe('FlashCard', () => {
  it('mặt trước hiển thị kanji kèm furigana', () => {
    render(<Harness onGrade={vi.fn()} />);
    const ruby = card().querySelector('ruby');
    expect(ruby).toHaveTextContent('学校');
    expect(ruby?.querySelector('rt')).toHaveTextContent('がっこう');
    expect(ruby?.querySelector('rt')).not.toHaveClass('invisible');
  });

  it('tắt furigana thì ẩn cách đọc nhưng giữ chỗ', () => {
    render(<Harness onGrade={vi.fn()} showFurigana={false} />);
    expect(card().querySelector('rt')).toHaveClass('invisible');
  });

  it('lật bằng click: nút chấm điểm chỉ hiện sau khi lật', async () => {
    const user = userEvent.setup();
    render(<Harness onGrade={vi.fn()} />);
    expect(isFlipped()).toBe(false);
    expect(gradeGroup()).not.toBeInTheDocument();

    await user.click(card());
    expect(isFlipped()).toBe(true);
    expect(gradeGroup()).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('lật bằng phím Space và nút "Lật thẻ"', async () => {
    const user = userEvent.setup();
    render(<Harness onGrade={vi.fn()} />);
    await user.keyboard(' ');
    expect(isFlipped()).toBe(true);
    await user.keyboard(' ');
    expect(isFlipped()).toBe(false);

    await user.click(screen.getByRole('button', { name: /Lật thẻ/ }));
    expect(isFlipped()).toBe(true);
  });

  it('phím 1–4 chỉ chấm điểm sau khi lật, và gọi đúng quality', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(<Harness onGrade={onGrade} />);

    await user.keyboard('1234');
    expect(onGrade).not.toHaveBeenCalled();

    await user.keyboard(' ');
    await user.keyboard('1');
    await user.keyboard('2');
    await user.keyboard('3');
    await user.keyboard('4');
    await user.keyboard('{ArrowLeft}');
    await user.keyboard('{ArrowRight}');
    expect(onGrade.mock.calls.map(([q]) => q)).toEqual([1, 3, 4, 5, 1, 4]);
  });

  it('bấm nút chấm điểm gọi đúng quality', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();
    render(<Harness onGrade={onGrade} />);
    await user.click(card());
    await user.click(screen.getByRole('button', { name: /Khó/ }));
    await user.click(screen.getByRole('button', { name: /Dễ/ }));
    expect(onGrade.mock.calls.map(([q]) => q)).toEqual([3, 5]);
  });

  it('từ không có kanji: mặt trước hiển thị kana', () => {
    render(
      <FlashCard
        word={makeWord('w2', { kanji: null, kana: 'テレビ' })}
        flipped={false}
        onFlip={vi.fn()}
        onGrade={vi.fn()}
        showFurigana
      />,
    );
    expect(card().querySelector('ruby')).toBeNull();
    expect(card()).toHaveTextContent('テレビ');
  });
});
