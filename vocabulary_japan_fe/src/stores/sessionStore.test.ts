import { beforeEach, describe, expect, it } from 'vitest';
import { makeWord } from '@/test/fixtures';
import { completedCount, useSessionStore } from './sessionStore';

const words = [makeWord('a'), makeWord('b'), makeWord('c')];

describe('sessionStore', () => {
  beforeEach(() => useSessionStore.getState().reset());

  it('thẻ Quên quay lại cuối hàng đợi đúng một lần', () => {
    const store = useSessionStore.getState();
    store.start('review', words);
    store.advance({ ...words[0]!, status: 'learning' }, 1);

    let state = useSessionStore.getState();
    expect(state.queue.map((c) => c.word.id)).toEqual(['b', 'c', 'a']);
    expect(state.queue[2]?.word.status).toBe('learning');
    expect(completedCount(state)).toBe(0);

    state.advance(words[1]!, 4);
    state = useSessionStore.getState();
    state.advance(words[2]!, 4);
    state = useSessionStore.getState();
    // Quên lần hai: không quay lại nữa.
    state.advance(words[0]!, 1);
    state = useSessionStore.getState();
    expect(state.queue).toHaveLength(0);
    expect(completedCount(state)).toBe(3);
    // Tổng kết dùng mức chấm lần đầu.
    expect(state.firstGrades).toEqual({ a: 1, b: 4, c: 4 });
  });

  it('bỏ qua khi từ được chấm không phải thẻ đầu hàng', () => {
    const store = useSessionStore.getState();
    store.start('learn', words);
    store.advance(words[2]!, 4);
    expect(useSessionStore.getState().queue).toHaveLength(3);
  });

  it('chấm xong thì úp thẻ lại', () => {
    const store = useSessionStore.getState();
    store.start('learn', words);
    store.setFlipped(true);
    store.advance(words[0]!, 4);
    expect(useSessionStore.getState().flipped).toBe(false);
  });
});
