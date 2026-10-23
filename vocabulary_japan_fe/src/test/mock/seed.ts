import type { Quality } from '@/types/api';
import { DEFAULT_SETTINGS } from '@/types/user';
import { DEFAULT_WORD_STATE, type Topic, type UserWordState, type Word } from '@/types/word';
import { addDays, addMinutes, endOfDay, startOfDay } from '@/utils/dates';
import { createRng, type Rng } from '@/utils/random';
import { applyGrade } from '@/utils/srs';
import { compareByTopicThenId } from '@/utils/today';
import topicsData from './data/topics.json';
import wordsData from './data/words.json';
import type { MockDb, MockReviewLog, MockUserRecord } from './types';

export const DB_VERSION = 4;

/** SHA-256 của "123456", mật khẩu của hai tài khoản mẫu. */
const SAMPLE_PASSWORD_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';

/**
 * Các ngày (tính lùi từ hôm nay) người dùng mẫu KHÔNG học trong 30 ngày qua.
 * Còn lại 20 ngày học; ngày 1–4 liên tiếp và ngày 5 nghỉ → streak hiện tại là 4
 * (hôm nay chưa học). Chuỗi dài nhất là ngày 6–11 (6 ngày).
 */
const SKIPPED_DAYS = new Set([5, 12, 13, 17, 20, 22, 23, 26, 28, 30]);
const HISTORY_DAYS = 30;
const SAMPLE_LEARNED = 25;
/** Số từ mới mỗi ngày học: rải đều 25 từ qua 20 ngày (2, 1, 1, 1, 2, 1, ...). */
const newWordsOnStudyDay = (index: number) => (index % 4 === 0 ? 2 : 1);
/** Giới hạn lượt ôn mỗi ngày của người dùng mẫu, để còn vài thẻ quá hạn. */
const REVIEW_CAP_PER_DAY = 3;

function randomQuality(rng: Rng): Quality {
  const r = rng();
  if (r < 0.12) return 1;
  if (r < 0.32) return 3;
  if (r < 0.85) return 4;
  return 5;
}

/**
 * Mô phỏng lịch sử học của người dùng mẫu bằng chính thuật toán SRS, nên trạng thái từng từ
 * khớp với lịch sử ôn. Mỗi ngày học (lúc 20:00): ôn tối đa 3 thẻ đến hạn (quá hạn lâu nhất
 * trước), rồi học 1–2 từ mới theo thứ tự chủ đề. Thẻ chấm Quên được ôn lại ngay
 * trong phiên với mức Được, giống phiên học thật.
 */
function simulateHistory(userId: string, words: Word[], now: Date) {
  const rng = createRng(20261021);
  const states: Record<string, UserWordState> = {};
  const reviews: MockReviewLog[] = [];

  const queue = words
    .filter((w) => w.level === 'N5')
    .sort(compareByTopicThenId)
    .slice(0, SAMPLE_LEARNED);

  const grade = (wordId: string, quality: Quality, at: Date) => {
    const before = states[wordId] ?? DEFAULT_WORD_STATE;
    states[wordId] = { ...before, ...applyGrade(before, quality, at) };
    reviews.push({
      user_id: userId,
      word_id: wordId,
      quality,
      reviewed_at: at.toISOString(),
      was_new: before.status === 'new',
    });
  };

  let studyDayIndex = 0;
  for (let daysAgo = HISTORY_DAYS; daysAgo >= 1; daysAgo -= 1) {
    if (SKIPPED_DAYS.has(daysAgo)) continue;
    const newCount = newWordsOnStudyDay(studyDayIndex);
    studyDayIndex += 1;
    const day = addDays(startOfDay(now), -daysAgo);
    let clock = new Date(day);
    clock.setHours(20, 0, 0, 0);
    const tick = () => {
      clock = addMinutes(clock, 1);
      return clock;
    };

    const relearn: string[] = [];
    const gradeWithRelearn = (wordId: string) => {
      const q = randomQuality(rng);
      grade(wordId, q, tick());
      if (q < 3) relearn.push(wordId);
    };

    // Ôn trước, theo thứ tự quá hạn lâu nhất.
    const due = Object.entries(states)
      .filter(([, s]) => s.status !== 'new' && s.due_at && new Date(s.due_at) <= endOfDay(day))
      .sort(([, a], [, b]) => (a.due_at ?? '').localeCompare(b.due_at ?? ''))
      .slice(0, REVIEW_CAP_PER_DAY)
      .map(([id]) => id);
    due.forEach(gradeWithRelearn);

    for (let i = 0; i < newCount && queue.length > 0; i += 1) {
      const word = queue.shift();
      if (word) gradeWithRelearn(word.id);
    }

    relearn.forEach((id) => grade(id, 4, tick()));
  }

  // Một vài từ yêu thích và ghi chú cho trang Từ vựng.
  const favorites = Object.keys(states).slice(0, 4);
  for (const id of favorites) {
    const state = states[id];
    if (state) states[id] = { ...state, is_favorite: true };
  }
  const firstId = favorites[0];
  const first = firstId ? states[firstId] : undefined;
  if (firstId && first) states[firstId] = { ...first, note: 'Nhớ: 家 + 族 = người trong nhà.' };

  return { states, reviews };
}

/** Tạo dữ liệu gốc. Lịch sử mẫu tính tương đối theo `now`. */
export function buildSeed(now: Date): MockDb {
  const topics = topicsData as Topic[];
  const words = wordsData as Word[];

  const user: MockUserRecord = {
    id: 'u_user',
    email: 'user@example.com',
    display_name: 'Minh Anh',
    role: 'user',
    created_at: addDays(now, -45).toISOString(),
    settings: { ...DEFAULT_SETTINGS, daily_goal: 10, level: 'N5' },
    password_hash: SAMPLE_PASSWORD_HASH,
  };
  const admin: MockUserRecord = {
    id: 'u_admin',
    email: 'admin@example.com',
    display_name: 'Quản trị viên',
    role: 'admin',
    created_at: addDays(now, -60).toISOString(),
    settings: { ...DEFAULT_SETTINGS },
    password_hash: SAMPLE_PASSWORD_HASH,
  };

  const history = simulateHistory(user.id, words, now);

  return {
    version: DB_VERSION,
    topics,
    words,
    users: [user, admin],
    states: { [user.id]: history.states, [admin.id]: {} },
    reviews: history.reviews,
    daily: {},
    quizzes: {},
  };
}
