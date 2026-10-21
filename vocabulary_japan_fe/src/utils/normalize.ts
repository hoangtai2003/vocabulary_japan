import type { Word } from '@/types/word';

/**
 * Chuẩn hóa chuỗi để tìm kiếm không phân biệt hoa thường và dấu tiếng Việt.
 * - NFKC: đưa chữ full-width (ＡＢＣ, ｶﾀｶﾅ nửa độ rộng) về dạng chuẩn.
 * - Tách dấu (NFD), bỏ các dấu kết hợp Latin U+0300–U+036F, đổi đ → d.
 * - Ghép lại (NFC) để chữ kana có dakuten (が, パ) không bị tách rời.
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Từ có khớp truy vấn không: tìm trong kanji, kana, romaji và mọi nghĩa tiếng Việt. */
export function wordMatchesQuery(
  word: Pick<Word, 'kanji' | 'kana' | 'romaji' | 'meanings_vi'>,
  query: string,
): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  const haystack = [word.kanji ?? '', word.kana, word.romaji, ...word.meanings_vi];
  return haystack.some((field) => normalizeText(field).includes(q));
}
