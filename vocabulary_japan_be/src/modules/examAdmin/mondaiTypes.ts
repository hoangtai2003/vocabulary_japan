import type { z } from 'zod';
import { prisma } from '../../db/prisma.ts';
import { Prisma } from '../../generated/prisma/client.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { toMondaiTypeJson } from '../exams/tree.ts';
import type { mondaiTypeCreateSchema, mondaiTypeUpdateSchema } from './schemas.ts';

/** Danh sách dạng mondai (mục 2.2): dữ liệu tham chiếu, quản trị viên xem, thêm và sửa. */
export async function listMondaiTypes() {
  const types = await prisma.mondaiType.findMany({ orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }] });
  return types.map(toMondaiTypeJson);
}

const toData = (input: z.infer<typeof mondaiTypeUpdateSchema>) => ({
  level: input.level,
  sectionTitle: input.section_title,
  labelJa: input.label_ja,
  nameVi: input.name_vi,
  answerKind: input.answer_kind,
  hasPassage: input.has_passage,
  defaultInstructions: input.default_instructions,
  sortOrder: input.sort_order,
});

export async function createMondaiType(input: z.infer<typeof mondaiTypeCreateSchema>) {
  try {
    return toMondaiTypeJson(
      await prisma.mondaiType.create({ data: { id: input.id, ...toData(input) } as Prisma.MondaiTypeCreateInput }),
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw ApiError.validation({ id: 'Mã dạng này đã có' });
    }
    throw error;
  }
}

/** Đổi kiểu trả lời hoặc cấp độ của dạng đã dùng trong đề sẽ làm đề sai luật: chặn lại. */
export async function updateMondaiType(id: string, input: z.infer<typeof mondaiTypeUpdateSchema>) {
  const type = await prisma.mondaiType.findUnique({ where: { id } });
  if (!type) throw ApiError.notFound('Không tìm thấy dạng mondai');
  const used = await prisma.mondai.count({ where: { typeId: id } });
  if (used > 0 && input.answer_kind && input.answer_kind !== type.answerKind) {
    throw ApiError.validation({ answer_kind: `Dạng đang dùng trong ${used} mondai, không đổi được kiểu trả lời` });
  }
  if (used > 0 && input.level && input.level !== type.level) {
    throw ApiError.validation({ level: `Dạng đang dùng trong ${used} mondai, không đổi được cấp độ` });
  }
  return toMondaiTypeJson(await prisma.mondaiType.update({ where: { id }, data: toData(input) }));
}
