import { readFileSync } from 'node:fs';
import { buildSearchText } from '../src/domain/normalize.ts';
import type { Word } from '../src/domain/types.ts';
import type { PrismaClient } from '../src/generated/prisma/client.ts';

/** Bộ từ vựng gốc, chép từ frontend (src/mock/data/). Dùng cho seed và cho test. */
export interface SeedTopic {
  id: string;
  name_vi: string;
}

const readJson = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`./seed-data/${file}`, import.meta.url), 'utf8')) as T;

export const loadTopics = () => readJson<SeedTopic[]>('topics.json');
export const loadWords = () => readJson<Word[]>('words.json');

/**
 * Thêm chủ đề và từ còn thiếu (skipDuplicates): chạy lại nhiều lần không tạo trùng và không ghi
 * đè chỉnh sửa của admin. Trả về số bản ghi đã thêm.
 */
export async function seedVocabulary(prisma: PrismaClient) {
  const topics = loadTopics();
  const words = loadWords();
  const topicResult = await prisma.topic.createMany({
    data: topics.map((t) => ({ id: t.id, nameVi: t.name_vi })),
    skipDuplicates: true,
  });
  const wordResult = await prisma.word.createMany({
    data: words.map((w) => ({
      id: w.id,
      kanji: w.kanji,
      kana: w.kana,
      romaji: w.romaji,
      meaningsVi: w.meanings_vi,
      type: w.type,
      level: w.level,
      topicId: w.topic_id,
      exampleJp: w.example_jp,
      exampleKana: w.example_kana,
      exampleRomaji: w.example_romaji,
      exampleVi: w.example_vi,
      searchText: buildSearchText(w),
    })),
    skipDuplicates: true,
  });
  return { topics, words, addedTopics: topicResult.count, addedWords: wordResult.count };
}
