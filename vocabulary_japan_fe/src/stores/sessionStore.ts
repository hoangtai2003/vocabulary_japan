import { create } from 'zustand';
import type { Quality } from '@/types/api';
import type { WordWithState } from '@/types/word';
import { shouldRequeue } from '@/utils/srs';

export type SessionKind = 'learn' | 'review';

export interface SessionCard {
  word: WordWithState;
  /** Thẻ đã được đưa xuống cuối hàng đợi một lần (không đưa lại lần nữa). */
  requeued: boolean;
}

const FURIGANA_KEY = 'jpvocab:furigana';

function readFurigana(): boolean {
  try {
    return localStorage.getItem(FURIGANA_KEY) !== 'off';
  } catch {
    return true;
  }
}

interface SessionState {
  kind: SessionKind | null;
  /** Thẻ đầu hàng là thẻ đang học. */
  queue: SessionCard[];
  /** Số thẻ lúc bắt đầu phiên (thẻ quay lại không làm tăng). */
  total: number;
  flipped: boolean;
  /** Mức chấm lần đầu của mỗi từ trong phiên, dùng cho màn hình tổng kết. */
  firstGrades: Record<string, Quality>;
  showFurigana: boolean;

  /** Bắt đầu phiên mới với danh sách chụp lại tại thời điểm này. */
  start: (kind: SessionKind, words: WordWithState[]) => void;
  setFlipped: (flipped: boolean) => void;
  /**
   * Ghi nhận thẻ đầu hàng đã chấm xong (server đã lưu) và chuyển sang thẻ kế.
   * Thẻ chấm dưới 3 được đưa xuống cuối hàng một lần, với trạng thái mới từ server.
   */
  advance: (updated: WordWithState, quality: Quality) => void;
  toggleFurigana: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  kind: null,
  queue: [],
  total: 0,
  flipped: false,
  firstGrades: {},
  showFurigana: readFurigana(),

  start: (kind, words) =>
    set({
      kind,
      queue: words.map((word) => ({ word, requeued: false })),
      total: words.length,
      flipped: false,
      firstGrades: {},
    }),

  setFlipped: (flipped) => set({ flipped }),

  advance: (updated, quality) =>
    set((state) => {
      const [current, ...rest] = state.queue;
      if (!current || current.word.id !== updated.id) return state;
      const queue =
        shouldRequeue(quality) && !current.requeued
          ? [...rest, { word: updated, requeued: true }]
          : rest;
      return {
        queue,
        flipped: false,
        firstGrades: { [updated.id]: quality, ...state.firstGrades },
      };
    }),

  toggleFurigana: () =>
    set((state) => {
      const next = !state.showFurigana;
      try {
        localStorage.setItem(FURIGANA_KEY, next ? 'on' : 'off');
      } catch {
        // bỏ qua
      }
      return { showFurigana: next };
    }),

  reset: () => set({ kind: null, queue: [], total: 0, flipped: false, firstGrades: {} }),
}));

/** Số thẻ đã xong: tổng ban đầu trừ số từ khác nhau còn trong hàng. */
export function completedCount(state: Pick<SessionState, 'queue' | 'total'>): number {
  return state.total - new Set(state.queue.map((c) => c.word.id)).size;
}
