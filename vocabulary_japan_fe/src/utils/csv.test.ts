import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './csv';
import { parseWordsCsv, sampleWordsCsv } from './wordCsv';

describe('csv', () => {
  it('đọc ô có dấu phẩy, ngoặc kép và xuống dòng', () => {
    const text = 'a,b\r\n"x, y","he said ""hi"""\n"dòng\nhai",z\n';
    expect(parseCsv(text)).toEqual([
      ['a', 'b'],
      ['x, y', 'he said "hi"'],
      ['dòng\nhai', 'z'],
    ]);
  });

  it('ghi rồi đọc lại cho kết quả như cũ', () => {
    const rows = [
      ['kanji', 'meanings_vi'],
      ['学校', 'trường học|nhà trường'],
      ['', 'có "ngoặc", phẩy'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('đọc file mẫu thành object từ vựng', () => {
    const { rows, headerError } = parseWordsCsv(sampleWordsCsv());
    expect(headerError).toBeNull();
    expect(rows[0]).toMatchObject({ kanji: '学校', meanings_vi: ['trường học'], level: 'N5' });
  });

  it('báo thiếu cột', () => {
    expect(parseWordsCsv('kanji,kana\n学校,がっこう').headerError).toMatch(/Thiếu cột/);
  });
});
