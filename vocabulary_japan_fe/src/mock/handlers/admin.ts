import { zodFieldErrors } from '@/schemas/fieldErrors';
import { wordInputSchema } from '@/schemas/word';
import type { AdminSortField, ImportRowError } from '@/types/api';
import { JLPT_LEVELS, type Word, type WordInput } from '@/types/word';
import { toDateKey } from '@/utils/dates';
import { wordMatchesQuery } from '@/utils/normalize';
import { parseWordsCsv, wordsToCsv } from '@/utils/wordCsv';
import { readDb, updateDb } from '../db';
import type { MockDb } from '../types';
import {
  api,
  errors,
  handle,
  http,
  HttpResponse,
  intParam,
  noContent,
  paginate,
  readJson,
  requireAdmin,
} from './http';

const SORT_FIELDS: AdminSortField[] = [
  'id',
  'kanji',
  'kana',
  'romaji',
  'level',
  'type',
  'topic_id',
];

function nextWordId(db: MockDb): string {
  const max = db.words.reduce((m, w) => Math.max(m, Number(w.id.replace(/\D/g, '')) || 0), 0);
  return `w${String(max + 1).padStart(3, '0')}`;
}

function wordKey(word: Pick<Word, 'kanji' | 'kana'>): string {
  return `${word.kanji ?? ''}|${word.kana}`;
}

/** Validate body tạo/sửa từ bằng schema dùng chung, kiểm tra chủ đề tồn tại. */
function parseWordInput(db: MockDb, body: unknown): WordInput {
  const parsed = wordInputSchema.safeParse(body);
  if (!parsed.success) throw errors.validation(zodFieldErrors(parsed.error));
  if (!db.topics.some((t) => t.id === parsed.data.topic_id)) {
    throw errors.validation({ topic_id: 'Chủ đề không tồn tại' });
  }
  return parsed.data;
}

/**
 * Kiểm tra dữ liệu import. Số dòng `row` bắt đầu từ 1 = dòng dữ liệu đầu tiên (CSV: không
 * tính dòng tiêu đề; JSON: phần tử đầu tiên của mảng). Lỗi cấu trúc file có row = 0.
 */
function validateImport(db: MockDb, format: 'csv' | 'json', content: string) {
  const errorsList: ImportRowError[] = [];
  let rawRows: unknown[];

  if (format === 'csv') {
    const { rows, headerError } = parseWordsCsv(content);
    if (headerError)
      return { valid: [], errors: [{ row: 0, field: 'content', message: headerError }] };
    rawRows = rows;
  } else {
    try {
      const parsed: unknown = JSON.parse(content);
      if (!Array.isArray(parsed)) throw new Error('not array');
      rawRows = parsed;
    } catch {
      return {
        valid: [],
        errors: [{ row: 0, field: 'content', message: 'File JSON phải là một mảng các từ' }],
      };
    }
  }

  if (rawRows.length === 0) {
    return {
      valid: [],
      errors: [{ row: 0, field: 'content', message: 'File không có dòng dữ liệu nào' }],
    };
  }

  const topicIds = new Set(db.topics.map((t) => t.id));
  const seen = new Set(db.words.map(wordKey));
  const valid: WordInput[] = [];

  rawRows.forEach((raw, index) => {
    const row = index + 1;
    const parsed = wordInputSchema.safeParse(raw);
    if (!parsed.success) {
      for (const [field, message] of Object.entries(zodFieldErrors(parsed.error))) {
        errorsList.push({ row, field, message });
      }
      return;
    }
    if (!topicIds.has(parsed.data.topic_id)) {
      errorsList.push({
        row,
        field: 'topic_id',
        message: `Chủ đề "${parsed.data.topic_id}" không tồn tại`,
      });
      return;
    }
    const key = wordKey(parsed.data);
    if (seen.has(key)) {
      errorsList.push({ row, field: 'kana', message: 'Từ này đã có trong dữ liệu' });
      return;
    }
    seen.add(key);
    valid.push(parsed.data);
  });

  return { valid, errors: errorsList };
}

export const adminHandlers = [
  http.get(
    api('/admin/words'),
    handle(({ request }) => {
      const db = readDb();
      requireAdmin(db);
      const url = new URL(request.url);
      const q = url.searchParams.get('q') ?? '';
      const level = url.searchParams.get('level');
      const topic = url.searchParams.get('topic');
      const sortParam = url.searchParams.get('sort') as AdminSortField | null;
      const sort: AdminSortField = sortParam && SORT_FIELDS.includes(sortParam) ? sortParam : 'id';
      const direction = url.searchParams.get('order') === 'desc' ? -1 : 1;

      if (level && !(JLPT_LEVELS as readonly string[]).includes(level)) {
        throw errors.validation({ level: 'Cấp độ không hợp lệ' });
      }

      const items = db.words
        .filter((w) => !level || w.level === level)
        .filter((w) => !topic || w.topic_id === topic)
        .filter((w) => wordMatchesQuery(w, q))
        .sort((a, b) => {
          const av = a[sort] ?? '';
          const bv = b[sort] ?? '';
          return (av.localeCompare(bv, 'ja') || a.id.localeCompare(b.id)) * direction;
        });

      return HttpResponse.json(
        paginate(items, intParam(url, 'page', 1), intParam(url, 'page_size', 20, 100)),
      );
    }),
  ),

  http.post(
    api('/admin/words'),
    handle(async ({ request }) => {
      const body = await readJson(request);
      const word = updateDb((db) => {
        requireAdmin(db);
        const created: Word = { id: nextWordId(db), ...parseWordInput(db, body) };
        db.words.push(created);
        return created;
      });
      return HttpResponse.json(word, { status: 201 });
    }),
  ),

  http.put(
    api('/admin/words/:id'),
    handle(async ({ request, params }) => {
      const body = await readJson(request);
      const word = updateDb((db) => {
        requireAdmin(db);
        const index = db.words.findIndex((w) => w.id === params.id);
        if (index < 0) throw errors.notFound('Không tìm thấy từ này');
        const updated: Word = { id: String(params.id), ...parseWordInput(db, body) };
        db.words[index] = updated;
        return updated;
      });
      return HttpResponse.json(word);
    }),
  ),

  http.delete(
    api('/admin/words/:id'),
    handle(({ params }) => {
      updateDb((db) => {
        requireAdmin(db);
        const id = String(params.id);
        if (!db.words.some((w) => w.id === id)) throw errors.notFound('Không tìm thấy từ này');
        db.words = db.words.filter((w) => w.id !== id);
        for (const states of Object.values(db.states)) delete states[id];
        for (const daily of Object.values(db.daily))
          daily.word_ids = daily.word_ids.filter((w) => w !== id);
      });
      return noContent();
    }),
  ),

  http.post(
    api('/admin/words/import'),
    handle(async ({ request }) => {
      const body = await readJson(request);
      const fields: Record<string, string> = {};
      if (body.format !== 'csv' && body.format !== 'json')
        fields.format = 'Định dạng là csv hoặc json';
      if (typeof body.content !== 'string') fields.content = 'Thiếu nội dung file';
      if (typeof body.dry_run !== 'boolean') fields.dry_run = 'dry_run phải là true hoặc false';
      if (Object.keys(fields).length > 0) throw errors.validation(fields);

      const result = updateDb((db) => {
        requireAdmin(db);
        const { valid, errors: rowErrors } = validateImport(
          db,
          body.format as 'csv' | 'json',
          body.content as string,
        );
        // Nhập thật: chỉ ghi các dòng hợp lệ, bỏ qua dòng lỗi (giao diện đã cho xem trước).
        if (!body.dry_run) {
          for (const input of valid) db.words.push({ id: nextWordId(db), ...input });
        }
        return {
          valid_count: valid.length,
          created_count: body.dry_run ? 0 : valid.length,
          errors: rowErrors,
        };
      });
      return HttpResponse.json(result);
    }),
  ),

  http.get(
    api('/admin/words/export'),
    handle(({ request }) => {
      const db = readDb();
      requireAdmin(db);
      const format = new URL(request.url).searchParams.get('format');
      if (format !== 'csv' && format !== 'json')
        throw errors.validation({ format: 'Định dạng là csv hoặc json' });

      const filename = `tu-vung-${toDateKey(new Date())}.${format}`;
      const headers = { 'Content-Disposition': `attachment; filename="${filename}"` };
      if (format === 'json') {
        return new HttpResponse(JSON.stringify(db.words, null, 2), {
          headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
      // BOM giúp Excel nhận đúng UTF-8.
      return new HttpResponse(`\uFEFF${wordsToCsv(db.words)}`, {
        headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8' },
      });
    }),
  ),
];
