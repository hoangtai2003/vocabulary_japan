import type { QuizMode, QuizOption, QuizQuestion, QuizResult, QuizAnswer } from '@/types/api';
import type { Word, WordWithState } from '@/types/word';
import { normalizeText } from './normalize';
import { shuffle, type Rng } from './random';

export const OPTIONS_PER_QUESTION = 4;

/** Nghĩa chính của từ. */
export function primaryMeaning(word: Pick<Word, 'meanings_vi'>): string {
  return word.meanings_vi[0] ?? '';
}

/** Cách viết tiếng Nhật hiển thị: kanji kèm kana, hoặc chỉ kana. */
export function japaneseLabel(word: Pick<Word, 'kanji' | 'kana'>): string {
  return word.kanji ? `${word.kanji}（${word.kana}）` : word.kana;
}

/** Nội dung đáp án của một từ theo chế độ quiz. */
export function optionTextFor(word: Word, mode: QuizMode): string {
  return mode === 'jp_vi' ? primaryMeaning(word) : japaneseLabel(word);
}

/**
 * Chọn từ cho quiz (mục 5.4): lấy ngẫu nhiên `count` từ trong `pool` (đã lọc theo cấp độ),
 * ưu tiên từ đã học (status ≠ new). Không đủ thì bổ sung từ mới.
 */
export function pickQuizWords(
  pool: WordWithState[],
  count: number,
  rng: Rng = Math.random,
): WordWithState[] {
  const learned = shuffle(
    pool.filter((w) => w.status !== 'new'),
    rng,
  );
  const fresh = shuffle(
    pool.filter((w) => w.status === 'new'),
    rng,
  );
  return [...learned, ...fresh].slice(0, count);
}

/**
 * Chọn 3 đáp án nhiễu cho `target` (mục 5.4).
 *
 * Loại bỏ ứng viên trùng nghĩa chính hoặc trùng cách đọc với đáp án đúng, và ứng viên có nội
 * dung đáp án trùng nhau (để 4 đáp án luôn khác nhau). Sau đó chọn theo thứ tự ưu tiên:
 *   1. cùng loại từ và cùng cấp độ
 *   2. cùng cấp độ
 *   3. cùng loại từ
 *   4. còn lại
 * Trong mỗi nhóm chọn ngẫu nhiên. Trả về ít hơn 3 nếu kho từ không đủ.
 */
export function pickDistractors(
  target: Word,
  pool: Word[],
  mode: QuizMode,
  rng: Rng = Math.random,
): Word[] {
  const targetMeaning = normalizeText(primaryMeaning(target));
  const targetKana = normalizeText(target.kana);
  const usedTexts = new Set([normalizeText(optionTextFor(target, mode))]);

  const candidates = pool.filter(
    (w) =>
      w.id !== target.id &&
      normalizeText(primaryMeaning(w)) !== targetMeaning &&
      normalizeText(w.kana) !== targetKana,
  );

  const tier = (w: Word): number => {
    const sameType = w.type === target.type;
    const sameLevel = w.level === target.level;
    if (sameType && sameLevel) return 0;
    if (sameLevel) return 1;
    if (sameType) return 2;
    return 3;
  };

  // Xáo trước rồi sắp ổn định theo nhóm: trong cùng nhóm, thứ tự là ngẫu nhiên.
  const ordered = shuffle(candidates, rng).sort((a, b) => tier(a) - tier(b));

  const picked: Word[] = [];
  for (const w of ordered) {
    if (picked.length === OPTIONS_PER_QUESTION - 1) break;
    const text = normalizeText(optionTextFor(w, mode));
    if (usedTexts.has(text)) continue;
    usedTexts.add(text);
    picked.push(w);
  }
  return picked;
}

/**
 * Tạo một câu hỏi: đề theo chế độ, 4 đáp án (1 đúng + 3 nhiễu) đã xáo vị trí.
 * - jp_vi: đề là kanji (hoặc kana), đáp án là nghĩa chính, prompt_sub là cách đọc.
 * - vi_jp: đề là nghĩa chính, đáp án là kanji kèm kana.
 */
export function buildQuestion(
  word: Word,
  pool: Word[],
  mode: QuizMode,
  questionId: string,
  rng: Rng = Math.random,
): QuizQuestion {
  const distractors = pickDistractors(word, pool, mode, rng);
  const optionWords = shuffle([word, ...distractors], rng);
  const options: QuizOption[] = optionWords.map((w, index) => ({
    id: `${questionId}_o${index + 1}`,
    text: optionTextFor(w, mode),
  }));
  const correctIndex = optionWords.indexOf(word);

  return {
    id: questionId,
    word_id: word.id,
    prompt: mode === 'jp_vi' ? (word.kanji ?? word.kana) : primaryMeaning(word),
    prompt_sub:
      mode === 'jp_vi' ? (word.kanji ? `${word.kana} · ${word.romaji}` : word.romaji) : null,
    options,
    correct_option_id: options[correctIndex]?.id ?? '',
  };
}

/** Chấm bài quiz. Câu không trả lời được tính là sai. Không thay đổi dữ liệu SRS. */
export function gradeQuiz(
  questions: QuizQuestion[],
  answers: QuizAnswer[],
  wordsById: Map<string, Word>,
): QuizResult {
  const chosen = new Map(answers.map((a) => [a.question_id, a.option_id]));
  const wrong: QuizResult['wrong'] = [];
  let correct = 0;

  for (const question of questions) {
    const optionId = chosen.get(question.id);
    if (optionId === question.correct_option_id) {
      correct += 1;
      continue;
    }
    const word = wordsById.get(question.word_id);
    if (!word) continue;
    wrong.push({
      question_id: question.id,
      word,
      chosen_text: question.options.find((o) => o.id === optionId)?.text ?? '',
      correct_text: question.options.find((o) => o.id === question.correct_option_id)?.text ?? '',
    });
  }

  const total = questions.length;
  return {
    total,
    correct,
    score_percent: total === 0 ? 0 : Math.round((correct / total) * 100),
    wrong,
  };
}
