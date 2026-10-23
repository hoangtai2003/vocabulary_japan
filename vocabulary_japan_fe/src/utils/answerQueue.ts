/**
 * Hàng đợi câu trả lời chưa lưu lên server (FR-RUN-04, NFR-EX-02). Mỗi lần chọn, đổi đáp án hay
 * đánh dấu được ghi vào localStorage trước, rồi mới gửi; gửi xong mới xóa khỏi hàng đợi. Mất mạng,
 * tải lại trang hay đóng trình duyệt thì lần mở sau gửi tiếp. Mỗi câu chỉ giữ một bản gộp mới nhất.
 */

export interface PendingAnswer {
  question_id: string;
  choice?: number | null;
  flagged?: boolean;
  time_spent_ms?: number;
  /** Thời điểm đổi trên trình duyệt (ISO); server bỏ qua bản cũ hơn bản đã lưu. */
  changed_at: string;
}

const KEY_PREFIX = 'jpvocab:exam-queue:';
const keyOf = (attemptId: string) => `${KEY_PREFIX}${attemptId}`;

export function readQueue(attemptId: string): Record<string, PendingAnswer> {
  try {
    const raw = localStorage.getItem(keyOf(attemptId));
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, PendingAnswer>) : {};
  } catch {
    return {};
  }
}

function writeQueue(attemptId: string, queue: Record<string, PendingAnswer>) {
  try {
    if (Object.keys(queue).length === 0) localStorage.removeItem(keyOf(attemptId));
    else localStorage.setItem(keyOf(attemptId), JSON.stringify(queue));
  } catch {
    // localStorage đầy hoặc bị chặn: vẫn gửi được khi còn mạng, chỉ mất khả năng gửi lại sau.
  }
}

/** Gộp thay đổi mới vào bản đang chờ của câu đó (trường mới ghi đè, thời gian lấy lớn nhất). */
export function enqueueAnswer(
  attemptId: string,
  patch: Omit<PendingAnswer, 'changed_at'>,
  now = new Date(),
): PendingAnswer {
  const queue = readQueue(attemptId);
  const before = queue[patch.question_id];
  const merged: PendingAnswer = {
    ...before,
    ...patch,
    time_spent_ms: Math.max(before?.time_spent_ms ?? 0, patch.time_spent_ms ?? 0) || undefined,
    changed_at: now.toISOString(),
  };
  queue[patch.question_id] = merged;
  writeQueue(attemptId, queue);
  return merged;
}

/** Xóa bản đã gửi, trừ khi trong lúc gửi đã có thay đổi mới hơn cho câu đó. */
export function removeSent(attemptId: string, sent: PendingAnswer) {
  const queue = readQueue(attemptId);
  if (queue[sent.question_id]?.changed_at === sent.changed_at) {
    delete queue[sent.question_id];
    writeQueue(attemptId, queue);
  }
}

export function dropQueued(attemptId: string, questionIds: string[]) {
  const queue = readQueue(attemptId);
  for (const id of questionIds) delete queue[id];
  writeQueue(attemptId, queue);
}

export function clearQueue(attemptId: string) {
  writeQueue(attemptId, {});
}
