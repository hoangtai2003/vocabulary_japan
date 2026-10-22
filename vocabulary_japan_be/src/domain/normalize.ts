/**
 * Chuẩn hóa chuỗi để tìm kiếm không phân biệt hoa thường và dấu tiếng Việt, giống frontend
 * (src/utils/normalize.ts):
 * - NFKC: đưa chữ full-width về dạng chuẩn.
 * - Tách dấu (NFD), bỏ dấu kết hợp Latin U+0300–U+036F, đổi đ → d.
 * - Ghép lại (NFC) để kana có dakuten (が, パ) không bị tách rời.
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

/**
 * Cột search_text của một từ (prompt mục 3.2): kanji, kana, romaji và mọi nghĩa đã chuẩn hóa,
 * nối bằng " | " để một truy vấn không vô tình khớp qua ranh giới hai trường.
 * Tìm kiếm: search_text ILIKE '%' || normalizeText(q) || '%'.
 */
export function buildSearchText(word: {
  kanji: string | null;
  kana: string;
  romaji: string;
  meanings_vi: string[];
}): string {
  return [word.kanji ?? '', word.kana, word.romaji, ...word.meanings_vi]
    .map(normalizeText)
    .filter(Boolean)
    .join(' | ');
}
