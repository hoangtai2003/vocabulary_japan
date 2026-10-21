import { describe, expect, it } from 'vitest';
import { makeWord } from '@/test/fixtures';
import { buildQuestion, gradeQuiz, pickDistractors, pickQuizWords } from './quiz';
import { createRng } from './random';

const pool = [
  makeWord('w01', { type: 'noun' }),
  makeWord('w02', { type: 'noun' }),
  makeWord('w03', { type: 'noun', meanings_vi: ['nghĩa w01'] }), // trùng nghĩa với w01
  makeWord('w04', { type: 'noun', kana: 'かなw01' }), // trùng cách đọc với w01
  makeWord('w05', { type: 'verb_godan' }),
  makeWord('w06', { type: 'noun', level: 'N4' }),
  makeWord('w07', { type: 'noun' }),
  makeWord('w08', { type: 'adj_i', kanji: null }),
];

describe('buildQuestion', () => {
  it.each(['jp_vi', 'vi_jp'] as const)(
    'chế độ %s: đúng 4 đáp án, không trùng, đúng một đáp án đúng',
    (mode) => {
      for (let seed = 1; seed <= 50; seed += 1) {
        const rng = createRng(seed);
        const target = pool[seed % pool.length]!;
        const question = buildQuestion(target, pool, mode, `q${seed}`, rng);

        expect(question.options).toHaveLength(4);
        expect(new Set(question.options.map((o) => o.text)).size).toBe(4);
        expect(new Set(question.options.map((o) => o.id)).size).toBe(4);
        expect(question.options.filter((o) => o.id === question.correct_option_id)).toHaveLength(1);
      }
    },
  );

  it('jp_vi: đề là kanji, đáp án đúng là nghĩa chính, prompt_sub là cách đọc', () => {
    const target = pool[0]!;
    const q = buildQuestion(target, pool, 'jp_vi', 'q1', createRng(7));
    expect(q.prompt).toBe(target.kanji);
    expect(q.prompt_sub).toContain(target.kana);
    expect(q.options.find((o) => o.id === q.correct_option_id)?.text).toBe(target.meanings_vi[0]);
  });

  it('từ không có kanji: đề là kana; vi_jp: đáp án là kanji kèm kana', () => {
    const kanaOnly = pool[7]!;
    expect(buildQuestion(kanaOnly, pool, 'jp_vi', 'q1', createRng(1)).prompt).toBe(kanaOnly.kana);
    const q = buildQuestion(pool[0]!, pool, 'vi_jp', 'q2', createRng(1));
    expect(q.prompt).toBe('nghĩa w01');
    expect(q.options.find((o) => o.id === q.correct_option_id)?.text).toBe('漢w01（かなw01）');
  });

  it('đáp án nhiễu không trùng nghĩa hay cách đọc với đáp án đúng', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const ids = pickDistractors(pool[0]!, pool, 'jp_vi', createRng(seed)).map((w) => w.id);
      expect(ids).not.toContain('w03');
      expect(ids).not.toContain('w04');
      expect(ids).not.toContain('w01');
    }
  });

  it('ưu tiên đáp án nhiễu cùng loại và cùng cấp độ', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const ids = pickDistractors(pool[0]!, pool, 'jp_vi', createRng(seed)).map((w) => w.id);
      // Chỉ w02, w07 cùng loại noun và cùng N5 (sau khi loại w03, w04)
      expect(ids.slice(0, 2).sort()).toEqual(['w02', 'w07']);
      // Ứng viên thứ ba ưu tiên cùng cấp độ N5 (w05, w08) trước w06 (N4)
      expect(['w05', 'w08']).toContain(ids[2]);
    }
  });
});

describe('pickQuizWords', () => {
  it('ưu tiên từ đã học, bổ sung từ mới khi thiếu', () => {
    const words = [
      makeWord('a', { status: 'learning' }),
      makeWord('b', { status: 'review' }),
      makeWord('c'),
      makeWord('d'),
    ];
    const picked = pickQuizWords(words, 3, createRng(3));
    expect(picked).toHaveLength(3);
    expect(
      picked
        .slice(0, 2)
        .map((w) => w.id)
        .sort(),
    ).toEqual(['a', 'b']);
    expect(['c', 'd']).toContain(picked[2]?.id);
  });
});

describe('gradeQuiz', () => {
  it('tính điểm và liệt kê câu sai, câu bỏ trống tính là sai', () => {
    const rng = createRng(11);
    const questions = pool.slice(0, 3).map((w, i) => buildQuestion(w, pool, 'jp_vi', `q${i}`, rng));
    const [q0, q1] = questions;
    const wrongOption = q1!.options.find((o) => o.id !== q1!.correct_option_id)!;
    const result = gradeQuiz(
      questions,
      [
        { question_id: q0!.id, option_id: q0!.correct_option_id },
        { question_id: q1!.id, option_id: wrongOption.id },
      ],
      new Map(pool.map((w) => [w.id, w])),
    );
    expect(result).toMatchObject({ total: 3, correct: 1, score_percent: 33 });
    expect(result.wrong).toHaveLength(2);
    expect(result.wrong[0]).toMatchObject({ question_id: q1!.id, chosen_text: wrongOption.text });
    expect(result.wrong[1]?.chosen_text).toBe('');
  });
});
