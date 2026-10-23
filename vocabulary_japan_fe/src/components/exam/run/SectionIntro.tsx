import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { AttemptSection, AttemptState } from '@/types/exam';
import { Markup } from '../Markup';

/**
 * Màn hình chuyển phần (FR-EXAM-04): trước mỗi phần có bấm giờ, người học bấm "Bắt đầu" thì
 * server mới ghi hạn nộp. Nêu phần vừa nộp (nếu có), số câu và thời gian của phần sắp làm.
 */
export function SectionIntro({
  attempt,
  section,
  instructions,
  onStart,
  starting,
}: {
  attempt: AttemptState;
  section: AttemptSection;
  instructions?: string;
  onStart: () => void;
  starting: boolean;
}) {
  const index = attempt.sections.findIndex((s) => s.id === section.id);
  const previous = attempt.sections[index - 1];
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-10">
      {previous?.submitted_at && (
        <p role="status" className="border-l-[3px] border-moss bg-moss-wash px-3 py-2 text-sm font-medium text-moss-ink">
          Đã nộp phần {index}: <span lang="ja">{previous.title}</span>
        </p>
      )}
      <div>
        <p className="text-sm text-ink-muted">
          {attempt.sections.length > 1 ? `Phần ${index + 1}/${attempt.sections.length}` : attempt.scope_label}
        </p>
        <h1 lang="ja" className="font-jp text-[26px] font-semibold">
          {section.title}
        </h1>
      </div>
      <Card className="grid grid-cols-2 divide-x divide-rule">
        <div className="p-4">
          <p className="text-sm text-ink-muted">Số câu</p>
          <p className="text-2xl font-semibold tabular-nums">{section.question_count}</p>
        </div>
        <div className="p-4">
          <p className="text-sm text-ink-muted">Thời gian</p>
          <p className="text-2xl font-semibold tabular-nums">{section.duration_minutes} phút</p>
        </div>
      </Card>
      {instructions?.trim() && <Markup source={instructions} lang="vi" className="text-[15px] text-ink-muted" />}
      <ul className="list-disc pl-5 text-[15px] text-ink-muted">
        <li>Đồng hồ chạy ngay khi bấm Bắt đầu và không dừng khi thoát hay tải lại trang.</li>
        <li>Hết giờ thì phần này tự nộp. Đáp án chỉ hiện sau khi nộp toàn bộ.</li>
        <li>Phím tắt: 1–4 chọn đáp án, ← → chuyển câu, F đánh dấu xem lại.</li>
      </ul>
      <Button size="lg" onClick={onStart} loading={starting} data-autofocus>
        Bắt đầu phần {index + 1}
      </Button>
    </div>
  );
}
