/**
 * Seed dữ liệu (prompt backend, mục 8). Chạy: npm run db:seed. Chạy lại nhiều lần không tạo trùng.
 *
 * - Chủ đề và từ vựng: lấy đúng file mock của frontend (prisma/seed-data/), giữ nguyên id
 *   (t01, w001...) để hai bên dùng chung một bộ. Chỉ thêm cái chưa có (skipDuplicates), không
 *   ghi đè, để không mất chỉnh sửa của admin trong DB.
 * - Khi NODE_ENV ≠ production: 2 tài khoản mẫu (mật khẩu 123456) và lịch sử học mẫu của
 *   user@example.com, mô phỏng bằng chính thuật toán SRS giống mock frontend
 *   (src/test/mock/seed.ts): ~25 từ N5 đã học, 20/30 ngày có học, streak hiện tại 4. Lịch sử tính
 *   tương đối theo ngày chạy seed, nên mỗi lần chạy sẽ xóa và tạo lại lịch sử của riêng tài khoản này.
 */
import { env } from '../src/config/env.ts';
import { addDays, addMinutes, endOfDay, startOfDay, toDateKey } from '../src/domain/dates.ts';
import { createRng, type Rng } from '../src/domain/random.ts';
import { applyGrade, DEFAULT_SRS_STATE, type Quality, type SrsState } from '../src/domain/srs.ts';
import { prisma } from '../src/db/prisma.ts';
import type { Word } from '../src/domain/types.ts';
import { hashPassword } from '../src/utils/password.ts';
import { seedVocabulary } from './vocabulary.ts';

const SAMPLE_PASSWORD = '123456';
const TZ = env.APP_TIMEZONE;

// ---------- Lịch sử mẫu: cùng tham số với frontend (src/test/mock/seed.ts) ----------

/** Ngày (tính lùi từ hôm nay) KHÔNG học: còn 20/30 ngày; ngày 1–4 học, ngày 5 nghỉ → streak 4. */
const SKIPPED_DAYS = new Set([5, 12, 13, 17, 20, 22, 23, 26, 28, 30]);
const HISTORY_DAYS = 30;
const SAMPLE_LEARNED = 25;
/** Rải 25 từ mới qua 20 ngày học (2, 1, 1, 1, 2, 1, ...). */
const newWordsOnStudyDay = (index: number) => (index % 4 === 0 ? 2 : 1);
/** Mỗi ngày ôn tối đa 3 thẻ, để còn vài thẻ quá hạn. */
const REVIEW_CAP_PER_DAY = 3;
const SAMPLE_NOTE = 'Nhớ: 家 + 族 = người trong nhà.';

function randomQuality(rng: Rng): Quality {
  const r = rng();
  if (r < 0.12) return 1;
  if (r < 0.32) return 3;
  if (r < 0.85) return 4;
  return 5;
}

interface SimState extends SrsState {
  first_learned_at: string | null;
}

interface SimLog {
  wordId: string;
  quality: Quality;
  reviewedAt: Date;
  isNew: boolean;
}

/**
 * Mô phỏng lịch sử bằng chính hàm SRS: mỗi ngày học (20:00 giờ địa phương) ôn tối đa 3 thẻ
 * đến hạn (quá hạn lâu nhất trước), rồi học 1–2 từ mới theo thứ tự chủ đề; thẻ chấm Quên
 * được chấm lại ngay trong phiên với mức Được, như phiên học thật.
 */
function simulateHistory(words: Word[], now: Date) {
  const rng = createRng(20261021);
  const states = new Map<string, SimState>();
  const logs: SimLog[] = [];

  const queue = words
    .filter((w) => w.level === 'N5')
    .sort((a, b) => (a.topic_id === b.topic_id ? (a.id < b.id ? -1 : 1) : a.topic_id < b.topic_id ? -1 : 1))
    .slice(0, SAMPLE_LEARNED);

  const grade = (wordId: string, quality: Quality, at: Date) => {
    const before = states.get(wordId) ?? { ...DEFAULT_SRS_STATE, first_learned_at: null };
    const isNew = before.status === 'new';
    states.set(wordId, {
      ...applyGrade(before, quality, at, TZ),
      first_learned_at: before.first_learned_at ?? at.toISOString(),
    });
    logs.push({ wordId, quality, reviewedAt: at, isNew });
  };

  let studyDayIndex = 0;
  for (let daysAgo = HISTORY_DAYS; daysAgo >= 1; daysAgo -= 1) {
    if (SKIPPED_DAYS.has(daysAgo)) continue;
    const newCount = newWordsOnStudyDay(studyDayIndex);
    studyDayIndex += 1;
    const day = addDays(startOfDay(now, TZ), -daysAgo, TZ);
    let clock = addMinutes(day, 20 * 60);
    const tick = () => (clock = addMinutes(clock, 1));

    const relearn: string[] = [];
    const gradeWithRelearn = (wordId: string) => {
      const q = randomQuality(rng);
      grade(wordId, q, tick());
      if (q < 3) relearn.push(wordId);
    };

    const dayEnd = endOfDay(day, TZ);
    const due = [...states.entries()]
      .filter(([, s]) => s.status !== 'new' && s.due_at && new Date(s.due_at) <= dayEnd)
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

  return { states, logs };
}

// ---------- Các bước seed ----------

async function seedTopicsAndWords() {
  const { topics, words, addedTopics, addedWords } = await seedVocabulary(prisma);
  console.log(`Chủ đề: thêm ${addedTopics}/${topics.length}. Từ vựng: thêm ${addedWords}/${words.length}.`);
  return words;
}

async function seedSampleAccounts(words: Word[]) {
  const now = new Date();
  const passwordHash = await hashPassword(SAMPLE_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    create: {
      email: 'user@example.com',
      passwordHash,
      displayName: 'Minh Anh',
      role: 'user',
      dailyGoal: 10,
      level: 'N5',
      createdAt: addDays(now, -45, TZ),
    },
    update: {},
  });
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    create: {
      email: 'admin@example.com',
      passwordHash,
      displayName: 'Quản trị viên',
      role: 'admin',
      createdAt: addDays(now, -60, TZ),
    },
    update: {},
  });

  // Lịch sử mẫu tính lại theo hôm nay: xóa lịch sử cũ của riêng tài khoản mẫu rồi tạo mới.
  const { states, logs } = simulateHistory(words, now);
  const ids = [...states.keys()];
  const favorites = new Set(ids.slice(0, 4));

  await prisma.$transaction([
    prisma.reviewLog.deleteMany({ where: { userId: user.id } }),
    prisma.userWord.deleteMany({ where: { userId: user.id } }),
    prisma.dailyNewWord.deleteMany({ where: { userId: user.id } }),
    prisma.quizSession.deleteMany({ where: { userId: user.id } }),
    prisma.userWord.createMany({
      data: ids.map((wordId) => {
        const s = states.get(wordId)!;
        return {
          userId: user.id,
          wordId,
          isFavorite: favorites.has(wordId),
          note: wordId === ids[0] ? SAMPLE_NOTE : '',
          status: s.status,
          ease: s.ease,
          intervalDays: s.interval_days,
          repetitions: s.repetitions,
          dueAt: s.due_at ? new Date(s.due_at) : null,
          lastReviewedAt: s.last_reviewed_at ? new Date(s.last_reviewed_at) : null,
          firstLearnedAt: s.first_learned_at ? new Date(s.first_learned_at) : null,
        };
      }),
    }),
    prisma.reviewLog.createMany({
      data: logs.map((log) => ({
        userId: user.id,
        wordId: log.wordId,
        quality: log.quality,
        isNew: log.isNew,
        reviewedAt: log.reviewedAt,
        localDate: toDateKey(log.reviewedAt, TZ),
      })),
    }),
  ]);

  const studyDays = new Set(logs.map((l) => toDateKey(l.reviewedAt, TZ))).size;
  console.log(
    `Tài khoản mẫu: user@example.com, admin@example.com (mật khẩu ${SAMPLE_PASSWORD}). ` +
      `Lịch sử mẫu: ${ids.length} từ đã học, ${logs.length} lượt chấm, ${studyDays} ngày học.`,
  );
}

async function main() {
  const words = await seedTopicsAndWords();
  if (env.NODE_ENV === 'production') {
    console.log('NODE_ENV=production: bỏ qua tài khoản và lịch sử mẫu. Tạo admin bằng npm run create-admin.');
    return;
  }
  await seedSampleAccounts(words);
}

main()
  .catch((error: unknown) => {
    console.error('Seed thất bại:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
