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

export type WordStatus = 'new' | 'learning' | 'review' | 'mastered';

export interface Topic {
  id: string;
  name_vi: string;
}

/** Dữ liệu chung của một từ (giống nhau cho mọi người dùng). */
export interface Word {
  id: string;
  /** null với từ chỉ viết bằng kana: これ, テレビ */
  kanji: string | null;
  /** Cách đọc hiragana hoặc katakana */
  kana: string;
  /** Hepburn, ví dụ "gakkou" */
  romaji: string;
  /** Nghĩa thứ nhất là nghĩa chính */
  meanings_vi: string[];
  type: WordType;
  level: JlptLevel;
  topic_id: string;
  example_jp: string;
  example_kana: string;
  example_romaji: string;
  example_vi: string;
}

/** Dữ liệu riêng của người dùng với từ đó. */
export interface UserWordState {
  is_favorite: boolean;
  /** Tối đa 500 ký tự */
  note: string;
  status: WordStatus;
  /** SRS, mặc định 2.5 */
  ease: number;
  /** SRS, mặc định 0 */
  interval_days: number;
  /** SRS, mặc định 0 */
  repetitions: number;
  /** ISO 8601, null khi chưa học */
  due_at: string | null;
  last_reviewed_at: string | null;
}

/** API trả về từ đã gộp hai phần trên. */
export type WordWithState = Word & UserWordState;

/** Dữ liệu tạo/sửa từ ở trang Quản trị: Word không có id. */
export type WordInput = Omit<Word, 'id'>;

export const JLPT_LEVELS = ['N5', 'N4', 'N3'] as const satisfies readonly JlptLevel[];

export const WORD_TYPES = [
  'noun',
  'pronoun',
  'verb_godan',
  'verb_ichidan',
  'verb_irregular',
  'adj_i',
  'adj_na',
  'adverb',
  'particle',
  'counter',
  'expression',
  'other',
] as const satisfies readonly WordType[];

export const WORD_STATUSES = [
  'new',
  'learning',
  'review',
  'mastered',
] as const satisfies readonly WordStatus[];

export const WORD_TYPE_LABELS: Record<WordType, string> = {
  noun: 'Danh từ',
  pronoun: 'Đại từ',
  verb_godan: 'Động từ nhóm 1',
  verb_ichidan: 'Động từ nhóm 2',
  verb_irregular: 'Động từ bất quy tắc',
  adj_i: 'Tính từ đuôi い',
  adj_na: 'Tính từ đuôi な',
  adverb: 'Trạng từ',
  particle: 'Trợ từ',
  counter: 'Lượng từ',
  expression: 'Cụm từ',
  other: 'Khác',
};

export const WORD_STATUS_LABELS: Record<WordStatus, string> = {
  new: 'Chưa học',
  learning: 'Đang học',
  review: 'Đang ôn',
  mastered: 'Đã thuộc',
};

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
