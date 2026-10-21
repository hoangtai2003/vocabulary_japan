import type { Word, WordInput } from '@/types/word';
import { parseCsv, toCsv } from './csv';

/** Cột CSV của từ vựng, theo đúng thứ tự. meanings_vi ngăn cách bằng |. */
export const WORD_CSV_COLUMNS = [
  'kanji',
  'kana',
  'romaji',
  'meanings_vi',
  'type',
  'level',
  'topic_id',
  'example_jp',
  'example_kana',
  'example_romaji',
  'example_vi',
] as const satisfies readonly (keyof WordInput)[];

const MEANING_SEPARATOR = '|';

function wordToRow(word: WordInput): string[] {
  return WORD_CSV_COLUMNS.map((col) => {
    if (col === 'meanings_vi') return word.meanings_vi.join(MEANING_SEPARATOR);
    if (col === 'kanji') return word.kanji ?? '';
    return word[col];
  });
}

/** Xuất CSV (UTF-8). Có cột id đứng đầu; khi nhập, cột id được bỏ qua. */
export function wordsToCsv(words: Word[]): string {
  return toCsv([['id', ...WORD_CSV_COLUMNS], ...words.map((w) => [w.id, ...wordToRow(w)])]);
}

/** File CSV mẫu cho trang Quản trị. */
export function sampleWordsCsv(): string {
  const sample: WordInput = {
    kanji: '学校',
    kana: 'がっこう',
    romaji: 'gakkou',
    meanings_vi: ['trường học'],
    type: 'noun',
    level: 'N5',
    topic_id: 't04',
    example_jp: '学校は八時に始まります。',
    example_kana: 'がっこうははちじにはじまります。',
    example_romaji: 'gakkou wa hachiji ni hajimarimasu.',
    example_vi: 'Trường học bắt đầu lúc tám giờ.',
  };
  return toCsv([[...WORD_CSV_COLUMNS], wordToRow(sample)]);
}

export interface CsvParseResult {
  /** Mỗi phần tử là một dòng dữ liệu dạng thô (chưa validate), theo tên cột. */
  rows: Record<string, unknown>[];
  /** Lỗi cấu trúc file (thiếu cột...). */
  headerError: string | null;
}

/**
 * Đọc CSV từ vựng thành các object thô để validate bằng schema zod.
 * Dòng đầu là tên cột. Ô kanji trống → null; meanings_vi tách theo |.
 */
export function parseWordsCsv(text: string): CsvParseResult {
  const table = parseCsv(text);
  const header = table[0]?.map((h) => h.trim());
  if (!header) return { rows: [], headerError: 'File trống' };

  const missing = WORD_CSV_COLUMNS.filter((col) => !header.includes(col));
  if (missing.length > 0) {
    return { rows: [], headerError: `Thiếu cột: ${missing.join(', ')}` };
  }

  const rows = table.slice(1).map((cells) => {
    const record: Record<string, unknown> = {};
    header.forEach((col, index) => {
      if (col === 'id') return;
      const raw = (cells[index] ?? '').trim();
      if (col === 'meanings_vi') {
        record[col] = raw
          .split(MEANING_SEPARATOR)
          .map((m) => m.trim())
          .filter(Boolean);
      } else if (col === 'kanji') {
        record[col] = raw === '' ? null : raw;
      } else {
        record[col] = raw;
      }
    });
    return record;
  });
  return { rows, headerError: null };
}
