import { describe, expect, it, vi } from 'vitest';
import { adminApi } from '@/api/adminApi';
import { authApi } from '@/api/authApi';
import { ApiError, setUnauthorizedHandler } from '@/api/client';
import { meApi } from '@/api/meApi';
import { quizApi } from '@/api/quizApi';
import { reviewApi } from '@/api/reviewApi';
import { statsApi } from '@/api/statsApi';
import { wordsApi } from '@/api/wordsApi';
import { addDays, endOfDay, startOfDay, toDateKey } from '@/utils/dates';

const login = (email = 'user@example.com', password = '123456') =>
  authApi.login({ email, password });

async function expectApiError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status, code });
  return error as ApiError;
}

describe('mock: xác thực', () => {
  it('sai mật khẩu → 401 INVALID_CREDENTIALS, không gọi xử lý phiên hết hạn', async () => {
    const onUnauthorized = vi.fn();
    const restore = setUnauthorizedHandler(onUnauthorized);
    await expectApiError(login('user@example.com', 'sai'), 401, 'INVALID_CREDENTIALS');
    await expectApiError(authApi.me(), 401, 'UNAUTHORIZED');
    expect(onUnauthorized).not.toHaveBeenCalled();
    restore();
  });

  it('dữ liệu sai → 400 kèm fields theo từng trường', async () => {
    const error = await expectApiError(login('khong-phai-email', ''), 400, 'VALIDATION_ERROR');
    expect(error.fields).toMatchObject({ email: expect.any(String), password: expect.any(String) });
  });

  it('đăng nhập, /auth/me, đăng xuất', async () => {
    const { user } = await login();
    expect(user).toMatchObject({ email: 'user@example.com', role: 'user' });
    expect(user).not.toHaveProperty('password_hash');
    expect((await authApi.me()).user.id).toBe(user.id);
    await authApi.logout();
    await expectApiError(authApi.me(), 401, 'UNAUTHORIZED');
  });

  it('đăng ký: 201, email trùng → 409 EMAIL_TAKEN', async () => {
    const { user } = await authApi.register({
      email: 'Moi@Example.com',
      password: '123456',
      display_name: 'Bạn mới',
    });
    expect(user).toMatchObject({
      email: 'moi@example.com',
      settings: { daily_goal: 10, level: 'N5', theme: 'system' },
    });
    await expectApiError(
      authApi.register({ email: 'user@example.com', password: '123456', display_name: 'Trùng' }),
      409,
      'EMAIL_TAKEN',
    );
  });

  it('401 ở endpoint khác gọi xử lý phiên hết hạn', async () => {
    const onUnauthorized = vi.fn();
    const restore = setUnauthorizedHandler(onUnauthorized);
    await expectApiError(wordsApi.today(), 401, 'UNAUTHORIZED');
    expect(onUnauthorized).toHaveBeenCalledOnce();
    restore();
  });
});

describe('mock: học và ôn với tài khoản mẫu', () => {
  it('từ mới hôm nay: đủ mục tiêu, cùng cấp độ, chốt cho cả ngày', async () => {
    await login();
    const today = await wordsApi.today();
    expect(today.date).toBe(toDateKey(new Date()));
    expect(today.goal).toBe(10);
    expect(today.learned_today).toBe(0);
    expect(today.new_words).toHaveLength(10);
    expect(today.new_words.every((w) => w.level === 'N5' && w.status === 'new')).toBe(true);

    const first = today.new_words[0]!;
    const { word } = await reviewApi.grade(first.id, 1);
    expect(word.status).toBe('learning');

    const again = await wordsApi.today();
    expect(again.new_words.map((w) => w.id)).toEqual(today.new_words.map((w) => w.id));
    expect(again.learned_today).toBe(1);
    expect(again.new_words[0]?.status).toBe('learning');
  });

  it('cần ôn: có thẻ quá hạn và thẻ đến hạn hôm nay, quá hạn lâu nhất trước', async () => {
    await login();
    const due = await reviewApi.due();
    const start = startOfDay(new Date()).getTime();
    const end = endOfDay(new Date()).getTime();
    const times = due.items.map((w) => new Date(w.due_at!).getTime());

    expect(due.total).toBe(due.items.length);
    expect(times.some((t) => t < start)).toBe(true);
    expect(times.some((t) => t >= start && t <= end)).toBe(true);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(due.items.every((w) => w.status !== 'new')).toBe(true);
    expect(new Date(due.next_due_at!).getTime()).toBeGreaterThan(end);

    expect((await reviewApi.due(2)).items).toHaveLength(2);
  });

  it('chấm điểm: quality ngoài 0–5 → 400, từ không tồn tại → 404', async () => {
    await login();
    await expectApiError(reviewApi.grade('w001', 9 as never), 400, 'VALIDATION_ERROR');
    await expectApiError(reviewApi.grade('khong-co', 4), 404, 'NOT_FOUND');
  });

  it('thống kê: streak 4, khoảng 20 ngày học trong 30 ngày', async () => {
    await login();
    const overview = await statsApi.overview();
    expect(overview.streak_days).toBe(4);
    expect(overview.longest_streak).toBeGreaterThanOrEqual(4);
    expect(overview.total_learned).toBe(25);
    expect(overview.due_today).toBe((await reviewApi.due()).total);
    expect(overview.today).toEqual({ new_learned: 0, reviewed: 0, goal: 10 });

    const to = toDateKey(new Date());
    const from = toDateKey(addDays(new Date(), -30));
    const calendar = await statsApi.calendar(from, to);
    expect(calendar.days).toHaveLength(20);
    expect(calendar.days.every((d) => d.count > 0)).toBe(true);

    const weekly = await statsApi.weekly();
    expect(weekly.weeks).toHaveLength(8);
    expect(weekly.weeks.reduce((sum, w) => sum + w.new_learned, 0)).toBe(25);

    await expectApiError(statsApi.calendar('2026-13-01', to), 400, 'VALIDATION_ERROR');
  });

  it('tài khoản admin chưa học từ nào', async () => {
    await login('admin@example.com');
    expect((await reviewApi.due()).total).toBe(0);
    expect((await statsApi.overview()).streak_days).toBe(0);
  });
});

describe('mock: từ vựng', () => {
  it('lọc, tìm không dấu, phân trang', async () => {
    await login();
    const page1 = await wordsApi.list({ level: 'N5', page_size: 20 });
    expect(page1).toMatchObject({ page: 1, page_size: 20 });
    expect(page1.items).toHaveLength(20);
    expect(page1.total).toBeGreaterThanOrEqual(60);

    const search = await wordsApi.list({ q: 'truong hoc' });
    expect(search.items.map((w) => w.kana)).toContain('がっこう');

    const learning = await wordsApi.list({ status: 'review' });
    expect(learning.items.every((w) => w.status === 'review')).toBe(true);
  });

  it('yêu thích và ghi chú', async () => {
    await login();
    const word = await wordsApi.setFavorite('w050', true);
    expect(word.is_favorite).toBe(true);
    const favorites = await wordsApi.list({ favorite: true, page_size: 100 });
    expect(favorites.items.map((w) => w.id)).toContain('w050');

    expect((await wordsApi.setNote('w050', 'ghi chú')).note).toBe('ghi chú');
    await expectApiError(wordsApi.setNote('w050', 'x'.repeat(501)), 400, 'VALIDATION_ERROR');
    expect((await wordsApi.detail('w050')).note).toBe('ghi chú');
    await expectApiError(wordsApi.detail('khong-co'), 404, 'NOT_FOUND');
  });
});

describe('mock: quiz', () => {
  it.each(['jp_vi', 'vi_jp'] as const)('%s: đủ câu, mỗi câu 4 đáp án khác nhau', async (mode) => {
    await login();
    const quiz = await quizApi.start({ mode, level: 'N5', count: 10 });
    expect(quiz.questions).toHaveLength(10);
    for (const q of quiz.questions) {
      expect(new Set(q.options.map((o) => o.text)).size).toBe(4);
      expect(q.options.some((o) => o.id === q.correct_option_id)).toBe(true);
    }

    const answers = quiz.questions.map((q) => ({
      question_id: q.id,
      option_id: q.correct_option_id,
    }));
    answers[0] = { question_id: quiz.questions[0]!.id, option_id: 'sai' };
    const result = await quizApi.submit({ quiz_id: quiz.quiz_id, answers });
    expect(result).toMatchObject({ total: 10, correct: 9, score_percent: 90 });
    expect(result.wrong[0]?.word.id).toBe(quiz.questions[0]!.word_id);
  });

  it('quiz không thay đổi SRS', async () => {
    await login();
    const before = await reviewApi.due();
    const quiz = await quizApi.start({ mode: 'jp_vi', level: 'N5', count: 20 });
    await quizApi.submit({ quiz_id: quiz.quiz_id, answers: [] });
    expect(await reviewApi.due()).toEqual(before);
  });
});

describe('mock: tài khoản', () => {
  it('đổi cài đặt cập nhật danh sách hôm nay', async () => {
    await login();
    const { user } = await meApi.updateSettings({ daily_goal: 5 });
    expect(user.settings.daily_goal).toBe(5);
    expect((await wordsApi.today()).new_words).toHaveLength(5);
    await expectApiError(meApi.updateSettings({ daily_goal: 7 as never }), 400, 'VALIDATION_ERROR');
  });

  it('đổi mật khẩu: sai mật khẩu hiện tại → 400 kèm field', async () => {
    await login();
    const error = await expectApiError(
      meApi.changePassword({ current_password: 'sai', new_password: '654321' }),
      400,
      'VALIDATION_ERROR',
    );
    expect(error.fields).toHaveProperty('current_password');
    await meApi.changePassword({ current_password: '123456', new_password: '654321' });
    await authApi.logout();
    await login('user@example.com', '654321');
  });

  it('xóa tài khoản', async () => {
    await login();
    await meApi.deleteAccount({ password: '123456' });
    await expectApiError(login(), 401, 'INVALID_CREDENTIALS');
  });
});

describe('mock: quản trị', () => {
  it('người dùng thường → 403 FORBIDDEN', async () => {
    await login();
    await expectApiError(adminApi.listWords({}), 403, 'FORBIDDEN');
  });

  it('CRUD và sắp xếp', async () => {
    await login('admin@example.com');
    const sorted = await adminApi.listWords({ sort: 'romaji', order: 'asc', page_size: 5 });
    expect(sorted.items.map((w) => w.romaji)).toEqual(
      [...sorted.items.map((w) => w.romaji)].sort(),
    );

    const created = await adminApi.createWord({
      kanji: '猫',
      kana: 'ねこ',
      romaji: 'neko',
      meanings_vi: ['con mèo'],
      type: 'noun',
      level: 'N5',
      topic_id: 't07',
      example_jp: '猫が好きです。',
      example_kana: 'ねこがすきです。',
      example_romaji: 'neko ga suki desu.',
      example_vi: 'Tôi thích mèo.',
    });
    expect(created.id).toMatch(/^w\d+$/);
    const { id: _id, ...input } = created;
    expect((await adminApi.updateWord(created.id, { ...input, romaji: 'NEKO' })).romaji).toBe(
      'neko',
    );
    await expectApiError(
      adminApi.updateWord(created.id, { ...input, kana: 'neko' }),
      400,
      'VALIDATION_ERROR',
    );
    await adminApi.deleteWord(created.id);
    await expectApiError(adminApi.deleteWord(created.id), 404, 'NOT_FOUND');

  });
});
