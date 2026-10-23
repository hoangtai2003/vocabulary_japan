import type { AttemptMode, ExamStatus } from '@/types/exam';

export const MODE_LABELS: Record<AttemptMode, string> = {
  exam: 'Thi thử',
  section: 'Luyện một phần',
  practice: 'Luyện không giới hạn giờ',
  wrong_review: 'Làm lại câu sai',
  by_type: 'Luyện theo dạng',
};

export const STATUS_LABELS: Record<ExamStatus, string> = {
  draft: 'Nháp',
  pending_review: 'Chờ duyệt',
  published: 'Đã xuất bản',
  hidden: 'Ẩn',
};

const dateTime = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** "23/10/2026, 14:05" */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** 1450 → "24 phút 10 giây"; 3725 → "1 giờ 2 phút". */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} giờ ${m} phút`;
  if (m > 0) return s > 0 ? `${m} phút ${s} giây` : `${m} phút`;
  return `${s} giây`;
}

/** Thời gian mỗi câu: 42500 → "43 giây", 95000 → "1 phút 35 giây". */
export const formatMs = (ms: number) => formatDuration(Math.round(ms / 1000));
