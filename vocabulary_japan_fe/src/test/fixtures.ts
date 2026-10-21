import { DEFAULT_WORD_STATE, type Word, type WordWithState } from '@/types/word';

/** Tạo từ giả cho test; ghi đè trường cần thiết qua `overrides`. */
export function makeWord(id: string, overrides: Partial<WordWithState> = {}): WordWithState {
  const base: Word = {
    id,
    kanji: `漢${id}`,
    kana: `かな${id}`,
    romaji: `kana${id}`,
    meanings_vi: [`nghĩa ${id}`],
    type: 'noun',
    level: 'N5',
    topic_id: 't01',
    example_jp: '例文です。',
    example_kana: 'れいぶんです。',
    example_romaji: 'reibun desu.',
    example_vi: 'Đây là câu ví dụ.',
  };
  return { ...base, ...DEFAULT_WORD_STATE, ...overrides };
}
