import { Link } from 'react-router-dom';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { Seal } from '@/components/ui/Seal';
import type { Quality } from '@/types/api';
import { GRADE_OPTIONS, type GradeKey } from '@/utils/grades';
import type { SessionKind } from '@/stores/sessionStore';

const barTone: Record<GradeKey, string> = {
  again: 'bg-son',
  hard: 'bg-ink-muted',
  good: 'bg-ink',
  easy: 'bg-moss',
};

/** Màn hình tổng kết cuối phiên: số từ, phân bố theo 4 mức chấm lần đầu, bước tiếp theo. */
export function SessionSummary({
  kind,
  firstGrades,
}: {
  kind: SessionKind;
  firstGrades: Record<string, Quality>;
}) {
  const grades = Object.values(firstGrades);
  const total = grades.length;
  const counts = GRADE_OPTIONS.map((option) => ({
    option,
    count: grades.filter((q) => q === option.quality).length,
  }));

  return (
    <section
      aria-labelledby="summary-title"
      className="mx-auto flex w-full max-w-[480px] animate-page-in flex-col gap-6"
    >
      <div className="flex items-center gap-4">
        <Seal char="済" size="lg" className="animate-stamp" />
        <div>
          <h1 id="summary-title" className="text-[28px]">
            {kind === 'learn' ? 'Xong phần từ mới' : 'Xong lượt ôn'}
          </h1>
          <p className="text-ink-muted">
            {kind === 'learn' ? `Bạn vừa học ${total} từ mới.` : `Bạn vừa ôn ${total} từ.`}
          </p>
        </div>
      </div>

      <dl className="flex flex-col gap-3 border-y border-rule py-4">
        {counts.map(({ option, count }) => (
          <div key={option.key} className="grid grid-cols-[4rem_1fr_2rem] items-center gap-3">
            <dt className="text-sm font-medium">{option.label}</dt>
            <dd className="h-3 bg-rule/60" aria-hidden="true">
              <div
                className={`h-full ${barTone[option.key]}`}
                style={{ width: total ? `${(count / total) * 100}%` : 0 }}
              />
            </dd>
            <dd className="text-right tabular-nums">{count}</dd>
          </div>
        ))}
      </dl>
      {counts[0] && counts[0].count > 0 && (
        <p className="text-sm text-ink-muted">
          Từ chấm "Quên" sẽ quay lại trong lượt ôn sắp tới, bạn không cần làm gì thêm.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {kind === 'learn' ? (
          <>
            <Link to="/on-tap" className={buttonClasses({ size: 'lg', className: 'sm:flex-1' })}>
              Sang Ôn tập
            </Link>
            <Link
              to="/"
              className={buttonClasses({
                variant: 'secondary',
                size: 'lg',
                className: 'sm:flex-1',
              })}
            >
              Về Hôm nay
            </Link>
          </>
        ) : (
          <>
            <Link to="/" className={buttonClasses({ size: 'lg', className: 'sm:flex-1' })}>
              Về Hôm nay
            </Link>
            <Link
              to="/quiz"
              className={buttonClasses({
                variant: 'secondary',
                size: 'lg',
                className: 'sm:flex-1',
              })}
            >
              Làm quiz
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
