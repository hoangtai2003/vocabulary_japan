import { describe, expect, it } from 'vitest';
import { normalizeText, wordMatchesQuery } from './normalize';

describe('normalizeText', () => {
  it('bỏ dấu tiếng Việt và không phân biệt hoa thường', () => {
    expect(normalizeText('Trường Học')).toBe('truong hoc');
    expect(normalizeText('ĐI LẠI')).toBe('di lai');
  });

  it('giữ nguyên kana có dakuten', () => {
    expect(normalizeText('がっこう')).toBe('がっこう');
    expect(normalizeText('パン')).toBe('パン');
  });
});

describe('wordMatchesQuery', () => {
  const word = { kanji: '学校', kana: 'がっこう', romaji: 'gakkou', meanings_vi: ['trường học'] };
  it.each(['学校', 'がっ', 'GAKKOU', 'truong', 'Trường học'])('khớp "%s"', (q) => {
    expect(wordMatchesQuery(word, q)).toBe(true);
  });
  it('không khớp', () => {
    expect(wordMatchesQuery(word, 'bệnh viện')).toBe(false);
  });
});
