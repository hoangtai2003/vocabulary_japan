import { DEFAULT_SRS_STATE, type SrsState } from '../domain/srs.ts';
import { DEFAULT_WORD_STATE, type Word, type WordType, type WordWithState } from '../domain/types.ts';
import type { Topic, UserWord, Word as WordModel } from '../generated/prisma/client.ts';

/** Model Prisma → Word của hợp đồng (snake_case). Không trả search_text, created_at, updated_at. */
export function toWordJson(word: WordModel): Word {
  return {
    id: word.id,
    kanji: word.kanji,
    kana: word.kana,
    romaji: word.romaji,
    meanings_vi: word.meaningsVi,
    type: word.type as WordType,
    level: word.level,
    topic_id: word.topicId,
    example_jp: word.exampleJp,
    example_kana: word.exampleKana,
    example_romaji: word.exampleRomaji,
    example_vi: word.exampleVi,
  };
}

/**
 * Từ ghép với trạng thái của người đang đăng nhập (prompt mục 3.2). Chưa có bản ghi user_words
 * thì dùng giá trị mặc định (status new, ease 2.5, ...).
 */
export function toWordWithState(word: WordModel, userWord: UserWord | null | undefined): WordWithState {
  if (!userWord) return { ...toWordJson(word), ...DEFAULT_WORD_STATE };
  return {
    ...toWordJson(word),
    is_favorite: userWord.isFavorite,
    note: userWord.note,
    status: userWord.status,
    ease: userWord.ease,
    interval_days: userWord.intervalDays,
    repetitions: userWord.repetitions,
    due_at: userWord.dueAt?.toISOString() ?? null,
    last_reviewed_at: userWord.lastReviewedAt?.toISOString() ?? null,
  };
}

export function toTopicJson(topic: Topic) {
  return { id: topic.id, name_vi: topic.nameVi };
}

/** Trạng thái SRS (hình dạng của domain/srs.ts) từ bản ghi user_words; chưa có thì mặc định. */
export function toSrsState(userWord: UserWord | null | undefined): SrsState {
  if (!userWord) return { ...DEFAULT_SRS_STATE };
  return {
    status: userWord.status,
    ease: userWord.ease,
    interval_days: userWord.intervalDays,
    repetitions: userWord.repetitions,
    due_at: userWord.dueAt?.toISOString() ?? null,
    last_reviewed_at: userWord.lastReviewedAt?.toISOString() ?? null,
  };
}
