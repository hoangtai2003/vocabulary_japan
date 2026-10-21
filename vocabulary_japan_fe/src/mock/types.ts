import type { QuizQuestion, ReviewLogEntry } from '@/types/api';
import type { User } from '@/types/user';
import type { Topic, UserWordState, Word } from '@/types/word';

export interface MockUserRecord extends User {
  /** SHA-256 (hex) của mật khẩu, băm bằng Web Crypto */
  password_hash: string;
}

export interface MockReviewLog extends ReviewLogEntry {
  user_id: string;
}

export interface MockDailyList {
  /** YYYY-MM-DD */
  date: string;
  level: User['settings']['level'];
  goal: number;
  word_ids: string[];
}

export interface MockQuiz {
  user_id: string;
  created_at: string;
  questions: QuizQuestion[];
}

export interface MockDb {
  version: number;
  topics: Topic[];
  words: Word[];
  users: MockUserRecord[];
  /** states[userId][wordId] — chỉ lưu từ đã có tương tác */
  states: Record<string, Record<string, UserWordState>>;
  reviews: MockReviewLog[];
  daily: Record<string, MockDailyList>;
  quizzes: Record<string, MockQuiz>;
}
