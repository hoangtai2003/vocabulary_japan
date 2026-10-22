/**
 * Kiểu dữ liệu của tầng domain, đúng hình dạng JSON trong API_CONTRACT.md (snake_case), giống
 * src/types của frontend. Nhờ vậy hàm và test domain chép được nguyên từ frontend; serializer
 * (src/serializers/) chịu trách nhiệm đổi model Prisma (camelCase) sang các kiểu này.
 */
import type { SrsState, WordStatus } from './srs.ts';

export type JlptLevel = 'N5' | 'N4' | 'N3';

export type WordType =
  | 'noun'
  | 'pronoun'
  | 'verb_godan'
  | 'verb_ichidan'
  | 'verb_irregular'
  | 'adj_i'
  | 'adj_na'
  | 'adverb'
  | 'particle'
  | 'counter'
  | 'expression'
  | 'other';

export interface Word {
  id: string;
  kanji: string | null;
  kana: string;
  romaji: string;
  meanings_vi: string[];
  type: WordType;
  level: JlptLevel;
  topic_id: string;
  example_jp: string;
  example_kana: string;
  example_romaji: string;
  example_vi: string;
}

export interface UserWordState extends SrsState {
  is_favorite: boolean;
  note: string;
  status: WordStatus;
}

export type WordWithState = Word & UserWordState;

/** Trạng thái mặc định khi người dùng chưa có bản ghi user_words cho từ (prompt mục 3.2). */
export const DEFAULT_WORD_STATE: UserWordState = {
  is_favorite: false,
  note: '',
  status: 'new',
  ease: 2.5,
  interval_days: 0,
  repetitions: 0,
  due_at: null,
  last_reviewed_at: null,
};

export type QuizMode = 'jp_vi' | 'vi_jp';

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  word_id: string;
  prompt: string;
  prompt_sub: string | null;
  options: QuizOption[];
  correct_option_id: string;
}

export interface QuizAnswer {
  question_id: string;
  option_id: string;
}

export interface QuizResult {
  total: number;
  correct: number;
  score_percent: number;
  wrong: { question_id: string; word: Word; chosen_text: string; correct_text: string }[];
}
