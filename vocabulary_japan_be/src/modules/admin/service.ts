import { prisma } from '../../db/prisma.ts';
import { buildSearchText, normalizeText } from '../../domain/normalize.ts';
import { Prisma } from '../../generated/prisma/client.ts';
import { toWordJson } from '../../serializers/word.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { escapeLike } from '../../utils/like.ts';
import { paginated, skipTake } from '../../utils/pagination.ts';
import type { AdminListQuery, SortField, WordInput } from './schemas.ts';

const notFound = () => ApiError.notFound('Không tìm thấy từ này');
const duplicate = () => ApiError.validation({ kana: 'Từ này đã có trong dữ liệu' }, 'Từ này đã có trong dữ liệu');

/** Tên trường sắp xếp của hợp đồng → field của model Prisma. */
const SORT_COLUMNS: Record<SortField, keyof Prisma.WordOrderByWithRelationInput> = {
  id: 'id',
  kanji: 'kanji',
  kana: 'kana',
  romaji: 'romaji',
  level: 'level',
  type: 'type',
  topic_id: 'topicId',
};

/**
 * GET /admin/words — Phân trang Word (không kèm trạng thái người dùng).
 * - Tìm q giống /words (search_text đã bỏ dấu, ILIKE, escape ký tự đại diện).
 * - Sắp xếp theo `sort`/`order` (phụ lục A.2), rồi theo id cùng chiều để thứ tự luôn ổn định.
 *   level theo thứ tự khai báo enum N5 → N4 → N3 (dễ → khó); kanji rỗng đứng đầu khi tăng dần.
 */
export async function listAdminWords(query: AdminListQuery) {
  const q = query.q ? escapeLike(normalizeText(query.q)) : '';
  const where: Prisma.WordWhereInput = {
    level: query.level,
    topicId: query.topic,
    ...(q ? { searchText: { contains: q, mode: 'insensitive' } } : {}),
  };
  const column = SORT_COLUMNS[query.sort];
  const primary: Prisma.WordOrderByWithRelationInput =
    column === 'kanji'
      ? { kanji: { sort: query.order, nulls: query.order === 'asc' ? 'first' : 'last' } }
      : { [column]: query.order };
  const orderBy = column === 'id' ? [primary] : [primary, { id: query.order }];

  const [total, words] = await prisma.$transaction([
    prisma.word.count({ where }),
    prisma.word.findMany({ where, orderBy, ...skipTake(query) }),
  ]);
  return paginated(words.map(toWordJson), query, total);
}

/**
 * Kiểm tra trước khi ghi (prompt mục 7):
 * - topic_id phải tồn tại, sai → VALIDATION_ERROR ở trường topic_id;
 * - không trùng (kanji, kana, level) với từ khác. Ràng buộc unique của PostgreSQL không chặn được
 *   khi kanji rỗng (NULL khác NULL), nên kiểm tra ở đây, coi hai kanji rỗng là bằng nhau.
 */
async function assertWritable(input: WordInput, excludeId?: string) {
  const topic = await prisma.topic.findUnique({ where: { id: input.topic_id }, select: { id: true } });
  if (!topic) throw ApiError.validation({ topic_id: 'Chủ đề không tồn tại' });
  const same = await prisma.word.findFirst({
    where: { kana: input.kana, kanji: input.kanji, level: input.level, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (same) throw duplicate();
}

/** Dữ liệu ghi vào bảng words; search_text tính lại mỗi lần ghi (prompt mục 3.2, 7). */
const toWordData = (input: WordInput) => ({
  kanji: input.kanji,
  kana: input.kana,
  romaji: input.romaji,
  meaningsVi: input.meanings_vi,
  type: input.type,
  level: input.level,
  topicId: input.topic_id,
  exampleJp: input.example_jp,
  exampleKana: input.example_kana,
  exampleRomaji: input.example_romaji,
  exampleVi: input.example_vi,
  searchText: buildSearchText(input),
});

/** Hai request ghi cùng một từ chạy song song: unique của DB chặn request sau → cùng lỗi trùng. */
function rethrowUnique(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw duplicate();
  throw error;
}

/** POST /admin/words → Word mới (id uuid). */
export async function createWord(input: WordInput) {
  await assertWritable(input);
  try {
    return toWordJson(await prisma.word.create({ data: toWordData(input) }));
  } catch (error) {
    rethrowUnique(error);
  }
}

/** PUT /admin/words/:id → Word đã sửa. Trạng thái học của người dùng với từ này giữ nguyên. */
export async function updateWord(id: string, input: WordInput) {
  if (!(await prisma.word.findUnique({ where: { id }, select: { id: true } }))) throw notFound();
  await assertWritable(input, id);
  try {
    return toWordJson(await prisma.word.update({ where: { id }, data: toWordData(input) }));
  } catch (error) {
    rethrowUnique(error);
  }
}

/**
 * DELETE /admin/words/:id. user_words và review_logs của từ bị xóa theo (onDelete: Cascade).
 * Danh sách từ mới hôm nay (daily_new_words) tự bỏ qua id không còn tồn tại khi đọc.
 */
export async function deleteWord(id: string) {
  const { count } = await prisma.word.deleteMany({ where: { id } });
  if (count === 0) throw notFound();
}
