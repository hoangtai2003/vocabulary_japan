import type { User, UserSettings } from './user';
import type { JlptLevel, Topic, UserWordState, Word, WordStatus, WordWithState } from './word';

// ---------- Chung ----------

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

/** Mã lỗi chỉ sinh ra ở phía client, không bao giờ do server trả về. */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN';

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string>;
  };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

// ---------- Xác thực ----------

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  user: User;
}

// ---------- Từ vựng ----------

export interface TodayResponse {
  /** YYYY-MM-DD */
  date: string;
  goal: number;
  new_words: WordWithState[];
  learned_today: number;
}

export interface WordsQuery {
  level?: JlptLevel;
  topic?: string;
  q?: string;
  favorite?: boolean;
  status?: WordStatus;
  page?: number;
  page_size?: number;
}

export type TopicsResponse = Topic[];

// ---------- Ôn tập ----------

export interface DueReviewsResponse {
  items: WordWithState[];
  total: number;
  /** Phần mở rộng (xem API_CONTRACT.md, phụ lục): due_at sớm nhất của các thẻ chưa đến hạn. */
  next_due_at: string | null;
}

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface GradeRequest {
  quality: Quality;
}

export interface GradeResponse {
  word: WordWithState;
}

// ---------- Quiz ----------

export type QuizMode = 'jp_vi' | 'vi_jp';
export type QuizCount = 10 | 20 | 30;

export interface QuizStartRequest {
  mode: QuizMode;
  level: JlptLevel;
  count: QuizCount;
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  word_id: string;
  /** jp_vi: kanji hoặc kana; vi_jp: nghĩa tiếng Việt */
  prompt: string;
  /** jp_vi: cách đọc, hiện sau khi trả lời */
  prompt_sub: string | null;
  /** Đúng 4 đáp án */
  options: QuizOption[];
  /** Gửi kèm để phản hồi tức thì */
  correct_option_id: string;
}

export interface QuizStartResponse {
  quiz_id: string;
  questions: QuizQuestion[];
}

export interface QuizAnswer {
  question_id: string;
  option_id: string;
}

export interface QuizSubmitRequest {
  quiz_id: string;
  answers: QuizAnswer[];
}

export interface QuizWrongAnswer {
  question_id: string;
  word: Word;
  chosen_text: string;
  correct_text: string;
}

export interface QuizResult {
  total: number;
  correct: number;
  score_percent: number;
  wrong: QuizWrongAnswer[];
}

// ---------- Thống kê ----------

export interface StatsOverview {
  streak_days: number;
  longest_streak: number;
  total_learned: number;
  mastered: number;
  due_today: number;
  today: {
    new_learned: number;
    reviewed: number;
    goal: number;
  };
}

export interface WeeklyStatsItem {
  /** YYYY-MM-DD, thứ Hai đầu tuần */
  week_start: string;
  new_learned: number;
  reviewed: number;
}

export interface WeeklyStats {
  weeks: WeeklyStatsItem[];
}

export interface CalendarDay {
  /** YYYY-MM-DD */
  date: string;
  count: number;
}

export interface CalendarStats {
  days: CalendarDay[];
}

// ---------- Tài khoản ----------

export type SettingsUpdate = Partial<UserSettings>;

export interface ProfileUpdate {
  display_name: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface DeleteAccountRequest {
  password: string;
}

export interface ReviewLogEntry {
  word_id: string;
  quality: Quality;
  reviewed_at: string;
  was_new: boolean;
}

export interface ExportData {
  exported_at: string;
  user: User;
  words: (UserWordState & { word_id: string; kanji: string | null; kana: string })[];
  reviews: ReviewLogEntry[];
}

// ---------- Quản trị ----------

export type AdminSortField = 'id' | 'kanji' | 'kana' | 'romaji' | 'level' | 'type' | 'topic_id';
export type SortOrder = 'asc' | 'desc';

export interface AdminWordsQuery {
  q?: string;
  level?: JlptLevel;
  topic?: string;
  page?: number;
  page_size?: number;
  /** Phần mở rộng (xem API_CONTRACT.md, phụ lục) */
  sort?: AdminSortField;
  order?: SortOrder;
}

export type ImportFormat = 'csv' | 'json';

export interface ImportRequest {
  format: ImportFormat;
  content: string;
  dry_run: boolean;
}

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  valid_count: number;
  created_count: number;
  errors: ImportRowError[];
}
