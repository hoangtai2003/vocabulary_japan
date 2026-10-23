import type { ExamIssue } from '@/types/exam';
import { cn } from '@/utils/cn';
import { describeLocation } from './validation';

/**
 * Danh sách lỗi (chặn xuất bản) và cảnh báo (không chặn) kèm vị trí (FR-CMS-14, FR-IMP-02).
 * Bấm một dòng để mở đúng chỗ cần sửa (khi có `onPick`).
 */
export function IssuesPanel({
  errors,
  warnings,
  onPick,
  className,
}: {
  errors: (ExamIssue & { path?: string | null })[];
  warnings: (ExamIssue & { path?: string | null })[];
  onPick?: (issue: ExamIssue) => void;
  className?: string;
}) {
  const list = (items: typeof errors, tone: 'error' | 'warning') =>
    items.map((issue, index) => {
      const body = (
        <>
          <span className={cn('font-medium', tone === 'error' ? 'text-son-ink' : 'text-ink')}>{issue.message}</span>
          <span className="block text-xs text-ink-muted">
            {describeLocation(issue) || 'Toàn đề'}
            {issue.path ? ` · ${issue.path}` : ''}
          </span>
        </>
      );
      return (
        <li key={`${tone}-${index}`} className="border-b border-rule last:border-b-0">
          {onPick ? (
            <button type="button" onClick={() => onPick(issue)} className="w-full px-1 py-2 text-left text-sm hover:bg-ink/[0.04]">
              {body}
            </button>
          ) : (
            <p className="px-1 py-2 text-sm">{body}</p>
          )}
        </li>
      );
    });

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <section aria-label="Lỗi">
        <h3 className="mb-1 text-sm font-semibold">
          {errors.length > 0 ? (
            <span className="text-son-ink">{errors.length} lỗi (chặn xuất bản)</span>
          ) : (
            <span className="text-moss-ink">Không có lỗi</span>
          )}
        </h3>
        {errors.length > 0 && <ul className="max-h-72 overflow-y-auto">{list(errors, 'error')}</ul>}
      </section>
      {warnings.length > 0 && (
        <section aria-label="Cảnh báo">
          <h3 className="mb-1 text-sm font-semibold">{warnings.length} cảnh báo (không chặn)</h3>
          <ul className="max-h-60 overflow-y-auto">{list(warnings, 'warning')}</ul>
        </section>
      )}
    </div>
  );
}
