import { logger } from '../logger.ts';

/**
 * Việc chạy nền trong cùng tiến trình (ví dụ chấm lại bài sau khi sửa đáp án, NFR-EX-09): response
 * trả về ngay, lỗi chỉ ghi log. Test gọi settleBackgroundJobs() để chờ các việc này xong.
 */
const pending = new Set<Promise<void>>();

export function runInBackground(label: string, task: () => Promise<unknown>) {
  const job: Promise<void> = Promise.resolve()
    .then(task)
    .then(
      () => undefined,
      (error: unknown) => logger.error({ err: error }, label),
    )
    .finally(() => pending.delete(job));
  pending.add(job);
}

export async function settleBackgroundJobs() {
  while (pending.size > 0) await Promise.all([...pending]);
}
