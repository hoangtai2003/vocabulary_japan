import type { JlptLevel, WordWithState } from '@/types/word';

/** So sánh để sắp từ theo chủ đề rồi theo id (thứ tự học từ mới). */
export function compareByTopicThenId(
  a: Pick<WordWithState, 'topic_id' | 'id'>,
  b: Pick<WordWithState, 'topic_id' | 'id'>,
): number {
  if (a.topic_id !== b.topic_id) return a.topic_id < b.topic_id ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

export interface SelectTodayWordsInput {
  words: WordWithState[];
  level: JlptLevel;
  goal: number;
  /** Từ phải giữ lại trong danh sách (đã học hôm nay), đứng đầu theo thứ tự cho sẵn. */
  keepIds?: string[];
}

/**
 * Chọn danh sách từ mới hôm nay (mục 5.3).
 *
 * Lấy `goal` từ có status = new thuộc `level`, sắp theo chủ đề rồi theo id. Danh sách được
 * phía lưu trữ chốt cho cả ngày; hàm này chỉ được gọi lại khi sang ngày mới, hoặc khi
 * người dùng đổi mục tiêu/cấp độ giữa ngày. Khi đó các từ đã học hôm nay (`keepIds`) được
 * giữ nguyên để tiến độ không bị mất, rồi bổ sung từ mới cho đủ mục tiêu.
 *
 * Nếu không đủ từ, trả về số có thật; giao diện hiển thị trạng thái rỗng gợi ý đổi cấp độ.
 */
export function selectTodayWords({
  words,
  level,
  goal,
  keepIds = [],
}: SelectTodayWordsInput): string[] {
  const existing = new Set(words.map((w) => w.id));
  const kept = keepIds.filter((id) => existing.has(id));
  const keptSet = new Set(kept);

  const fresh = words
    .filter((w) => w.status === 'new' && w.level === level && !keptSet.has(w.id))
    .sort(compareByTopicThenId)
    .slice(0, Math.max(0, goal - kept.length))
    .map((w) => w.id);

  return [...kept, ...fresh];
}
