import {
  DEFAULT_WORD_STATE,
  type UserWordState,
  type Word,
  type WordWithState,
} from '@/types/word';
import { endOfDay, toDateKey } from '@/utils/dates';
import { selectTodayWords } from '@/utils/today';
import type { MockDb, MockUserRecord } from '../types';

export function userStates(db: MockDb, userId: string): Record<string, UserWordState> {
  db.states[userId] ??= {};
  return db.states[userId];
}

export function withState(word: Word, states: Record<string, UserWordState>): WordWithState {
  return { ...word, ...(states[word.id] ?? DEFAULT_WORD_STATE) };
}

export function allWordsWithState(db: MockDb, userId: string): WordWithState[] {
  const states = userStates(db, userId);
  return db.words.map((w) => withState(w, states));
}

/** Từ đến hạn: status ≠ new và due_at ≤ cuối ngày hôm nay, quá hạn lâu nhất trước. */
export function dueWords(db: MockDb, userId: string, now: Date): WordWithState[] {
  const end = endOfDay(now).getTime();
  return allWordsWithState(db, userId)
    .filter((w) => w.status !== 'new' && w.due_at !== null && new Date(w.due_at).getTime() <= end)
    .sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? '') || a.id.localeCompare(b.id));
}

/** due_at sớm nhất trong các thẻ chưa đến hạn hôm nay. */
export function nextDueAt(db: MockDb, userId: string, now: Date): string | null {
  const end = endOfDay(now).getTime();
  const upcoming = allWordsWithState(db, userId)
    .map((w) => w.due_at)
    .filter((d): d is string => d !== null && new Date(d).getTime() > end)
    .sort();
  return upcoming[0] ?? null;
}

/** Id các từ được chấm lần đầu trong ngày `dateKey`. */
export function learnedOn(db: MockDb, userId: string, dateKey: string): string[] {
  return db.reviews
    .filter(
      (r) => r.user_id === userId && r.was_new && toDateKey(new Date(r.reviewed_at)) === dateKey,
    )
    .map((r) => r.word_id);
}

/**
 * Danh sách từ mới hôm nay, chốt cho cả ngày (lưu trong db.daily). Chỉ tính lại khi sang
 * ngày mới hoặc khi người dùng đổi mục tiêu/cấp độ; khi tính lại thì giữ các từ đã học hôm nay.
 * Hàm này có ghi vào `db`, người gọi cần lưu lại.
 */
export function todayWordIds(db: MockDb, user: MockUserRecord, now: Date): string[] {
  const date = toDateKey(now);
  const { level, daily_goal: goal } = user.settings;
  const current = db.daily[user.id];
  if (current && current.date === date && current.level === level && current.goal === goal) {
    return current.word_ids;
  }

  const learnedToday = new Set(learnedOn(db, user.id, date));
  const keepIds =
    current?.date === date ? current.word_ids.filter((id) => learnedToday.has(id)) : [];
  const wordIds = selectTodayWords({ words: allWordsWithState(db, user.id), level, goal, keepIds });
  db.daily[user.id] = { date, level, goal, word_ids: wordIds };
  return wordIds;
}
