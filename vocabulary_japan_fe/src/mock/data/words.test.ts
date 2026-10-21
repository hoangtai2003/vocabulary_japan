import { describe, expect, it } from 'vitest';
import { wordInputSchema } from '@/schemas/word';
import type { Topic, Word } from '@/types/word';
import topicsData from './topics.json';
import wordsData from './words.json';

const words = wordsData as Word[];
const topics = topicsData as Topic[];
const KANJI_RE = /[一-鿿々]/u;

describe('dữ liệu từ vựng mock', () => {
  it('đủ số lượng theo mục 9.1', () => {
    expect(words.filter((w) => w.level === 'N5').length).toBeGreaterThanOrEqual(60);
    expect(words.filter((w) => w.level === 'N4').length).toBeGreaterThanOrEqual(25);
    expect(words.filter((w) => w.kanji === null).length).toBeGreaterThanOrEqual(8);
    expect(topics.length).toBeGreaterThanOrEqual(6);
    for (const topic of topics) {
      expect(
        words.filter((w) => w.topic_id === topic.id).length,
        topic.name_vi,
      ).toBeGreaterThanOrEqual(8);
    }
  });

  it('mọi từ hợp lệ theo schema và có chủ đề tồn tại', () => {
    const topicIds = new Set(topics.map((t) => t.id));
    for (const word of words) {
      const { id: _id, ...input } = word;
      const result = wordInputSchema.safeParse(input);
      expect(result.success, `${word.id} ${word.kana}: ${result.error?.message}`).toBe(true);
      expect(topicIds.has(word.topic_id), word.id).toBe(true);
    }
  });

  it('id và cặp kanji/kana không trùng', () => {
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length);
    expect(new Set(words.map((w) => `${w.kanji}|${w.kana}`)).size).toBe(words.length);
  });

  it('câu ví dụ bằng kana không còn kanji, romaji viết thường không dấu', () => {
    for (const word of words) {
      expect(KANJI_RE.test(word.example_kana), `${word.id}: ${word.example_kana}`).toBe(false);
      expect(word.example_romaji, word.id).toMatch(/^[a-z0-9 ,.'"?!-]+$/);
    }
  });

  it('câu ví dụ chứa từ đó hoặc gốc của nó (bỏ đuôi chia)', () => {
    for (const word of words) {
      // する chỉ còn gốc rỗng sau khi bỏ đuôi; khi đó tìm dạng chia し.
      const stem = (word.kanji ?? word.kana).replace(/(する|[るうくぐすつぬぶむい])$/u, '') || 'し';
      expect(word.example_jp.includes(stem), `${word.id}: ${stem} / ${word.example_jp}`).toBe(true);
    }
  });
});
