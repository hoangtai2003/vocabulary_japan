import type { JlptLevel, WordWithState } from './types.ts';

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
 * Chọn danh sách từ mới hôm nay (prompt mục 5.3), chép từ frontend (src/utils/today.ts).
 *
 * Lấy `goal` từ có status = new thuộc `level`, sắp theo chủ đề rồi theo id. Ở backend,
 * "status = new" tương đương "chưa có first_learned_at (hoặc chưa có bản ghi user_words)":
 * một từ chỉ rời trạng thái new khi được chấm lần đầu, đúng lúc first_learned_at được đặt.
 * Danh sách được chốt cho cả ngày (bảng daily_new_words); hàm chỉ được gọi lại khi sang ngày
 * mới. `keepIds` dùng khi tính lại giữa ngày: giữ các từ đã học hôm nay rồi bổ sung cho đủ.
 *
 * Không đủ từ thì trả về số có thật; giao diện hiển thị trạng thái rỗng gợi ý đổi cấp độ.
 */
export function selectTodayWords({ words, level, goal, keepIds = [] }: SelectTodayWordsInput): string[] {
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
