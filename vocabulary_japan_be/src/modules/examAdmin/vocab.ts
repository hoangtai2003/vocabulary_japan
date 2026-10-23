import { prisma } from '../../db/prisma.ts';
import type { Explanation } from '../../domain/exam.ts';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.ts';

type Db = PrismaClient | Prisma.TransactionClient;

const stripTilde = (s: string) => s.replace(/^[〜～~]+|[〜～~]+$/g, '').trim();

/**
 * Gắn mã từ cho mục từ vựng của lời giải (DR-EX-09): từ chưa có word_id mà kanji + cách đọc khớp
 * một từ trong kho (hoặc từ chỉ viết kana khớp kana) thì tự gán; word_id trỏ tới từ không còn
 * tồn tại thì bỏ. Quản trị viên vẫn sửa tay được.
 */
export async function linkVocabulary(explanations: Explanation[], db: Db = prisma): Promise<void> {
  const items = explanations.flatMap((e) => e.vocab);
  if (items.length === 0) return;

  const surfaces = [...new Set(items.flatMap((v) => [stripTilde(v.word), stripTilde(v.reading)]).filter(Boolean))];
  const ids = [...new Set(items.map((v) => v.word_id).filter((id): id is string => Boolean(id)))];
  const words = await db.word.findMany({
    where: { OR: [{ id: { in: ids } }, { kanji: { in: surfaces } }, { kana: { in: surfaces } }] },
    select: { id: true, kanji: true, kana: true },
  });
  const byId = new Set(words.map((w) => w.id));

  for (const item of items) {
    if (item.word_id && byId.has(item.word_id)) continue;
    const word = stripTilde(item.word);
    const reading = stripTilde(item.reading);
    const match =
      words.find((w) => w.kanji !== null && w.kanji === word && w.kana === reading) ??
      words.find((w) => w.kanji === null && w.kana === word);
    item.word_id = match?.id ?? null;
  }
}
