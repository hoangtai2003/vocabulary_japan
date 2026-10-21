import type { QuizAnswer, QuizCount, QuizMode } from '@/types/api';
import { JLPT_LEVELS, type JlptLevel } from '@/types/word';
import { buildQuestion, gradeQuiz, OPTIONS_PER_QUESTION, pickQuizWords } from '@/utils/quiz';
import { makeId } from '../crypto';
import { readDb, updateDb } from '../db';
import { api, errors, handle, http, HttpResponse, readJson, requireUser } from './http';
import { allWordsWithState } from './shared';

const MODES: QuizMode[] = ['jp_vi', 'vi_jp'];
const COUNTS: QuizCount[] = [10, 20, 30];
/** Giữ tối đa chừng này quiz trong localStorage, xóa quiz cũ nhất. */
const MAX_STORED_QUIZZES = 20;

export const quizHandlers = [
  http.post(
    api('/quiz/start'),
    handle(async ({ request }) => {
      const body = await readJson(request);
      const fields: Record<string, string> = {};
      if (!MODES.includes(body.mode as QuizMode))
        fields.mode = 'Chọn chế độ Nhật → Việt hoặc Việt → Nhật';
      if (!(JLPT_LEVELS as readonly unknown[]).includes(body.level))
        fields.level = 'Cấp độ không hợp lệ';
      if (!COUNTS.includes(body.count as QuizCount)) fields.count = 'Số câu là 10, 20 hoặc 30';
      if (Object.keys(fields).length > 0) throw errors.validation(fields);

      const mode = body.mode as QuizMode;
      const level = body.level as JlptLevel;
      const count = body.count as QuizCount;

      const result = updateDb((db) => {
        const user = requireUser(db);
        const pool = allWordsWithState(db, user.id).filter((w) => w.level === level);
        if (pool.length < OPTIONS_PER_QUESTION) {
          throw errors.validation({ level: `Cấp độ ${level} chưa đủ từ để làm quiz` });
        }

        const quizId = makeId('quiz');
        const questions = pickQuizWords(pool, count).map((word, index) =>
          buildQuestion(word, pool, mode, `${quizId}_q${index + 1}`),
        );

        db.quizzes[quizId] = { user_id: user.id, created_at: new Date().toISOString(), questions };
        const ids = Object.keys(db.quizzes).sort((a, b) =>
          (db.quizzes[a]?.created_at ?? '').localeCompare(db.quizzes[b]?.created_at ?? ''),
        );
        ids
          .slice(0, Math.max(0, ids.length - MAX_STORED_QUIZZES))
          .forEach((id) => delete db.quizzes[id]);

        return { quiz_id: quizId, questions };
      });

      return HttpResponse.json(result);
    }),
  ),

  http.post(
    api('/quiz/submit'),
    handle(async ({ request }) => {
      const body = await readJson(request);
      if (typeof body.quiz_id !== 'string') throw errors.validation({ quiz_id: 'Thiếu quiz_id' });
      if (!Array.isArray(body.answers))
        throw errors.validation({ answers: 'answers phải là mảng' });

      const db = readDb();
      const user = requireUser(db);
      const quiz = db.quizzes[body.quiz_id];
      if (!quiz || quiz.user_id !== user.id) throw errors.notFound('Không tìm thấy bài quiz');

      const answers = (body.answers as unknown[]).filter(
        (a): a is QuizAnswer =>
          typeof a === 'object' &&
          a !== null &&
          typeof (a as QuizAnswer).question_id === 'string' &&
          typeof (a as QuizAnswer).option_id === 'string',
      );
      // Quiz không thay đổi dữ liệu SRS.
      return HttpResponse.json(
        gradeQuiz(quiz.questions, answers, new Map(db.words.map((w) => [w.id, w]))),
      );
    }),
  ),
];
