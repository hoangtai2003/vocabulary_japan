import { Card } from '@/components/ui/Card';
import type { ScoreSummary } from '@/types/exam';
import { cn } from '@/utils/cn';

/**
 * Điểm ước tính nhóm "Kiến thức ngôn ngữ・Đọc hiểu" (FR-RES-03 đến 06): luôn kèm dòng giải thích
 * đây không phải điểm JLPT chính thức; so với điểm liệt; không kết luận đỗ/trượt vì chưa có phần
 * Nghe, chỉ nói số điểm Nghe tối thiểu cần có.
 */
export function ScoreCard({ score, correct, total }: { score: ScoreSummary; correct: number; total: number }) {
  const percent = (score.estimated_score / score.max_score) * 100;
  const minPercent = (score.sectional_min / score.max_score) * 100;
  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">Điểm ước tính · {score.group}</p>
          <p className="font-display text-[40px] font-semibold leading-none tabular-nums">
            {score.estimated_score}
            <span className="text-xl text-ink-muted">/{score.max_score}</span>
          </p>
        </div>
        <p className="text-ink-muted tabular-nums">
          Đúng {correct}/{total} câu
        </p>
      </div>

      {/* Thanh điểm với vạch điểm liệt */}
      <div
        role="meter"
        aria-label="Điểm ước tính"
        aria-valuemin={0}
        aria-valuemax={score.max_score}
        aria-valuenow={score.estimated_score}
        aria-valuetext={`${score.estimated_score} trên ${score.max_score}, điểm liệt ${score.sectional_min}`}
        className="relative h-3 w-full bg-rule"
      >
        <div
          className={cn('h-full', score.meets_sectional_min ? 'bg-moss' : 'bg-son')}
          style={{ width: `${percent}%` }}
        />
        <div aria-hidden="true" className="absolute -top-1 h-5 w-0.5 bg-ink" style={{ left: `${minPercent}%` }} />
        <span aria-hidden="true" className="absolute top-5 -translate-x-1/2 text-xs text-ink-muted" style={{ left: `${minPercent}%` }}>
          {score.sectional_min}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2 text-[15px]">
        <p className={cn('font-semibold', score.meets_sectional_min ? 'text-moss-ink' : 'text-son-ink')}>
          {score.meets_sectional_min
            ? `Đạt điểm liệt của nhóm (${score.sectional_min}/${score.max_score}).`
            : `Chưa đạt điểm liệt của nhóm (${score.sectional_min}/${score.max_score}).`}
        </p>
        <p>
          {score.listening_needed !== null
            ? `Để đỗ (tổng ${score.pass_total} điểm) với điểm này, phần Nghe cần tối thiểu ${score.listening_needed}/60 điểm.`
            : 'Với điểm hiện tại, chưa thể đỗ dù phần Nghe đạt tối đa.'}
        </p>
        <p className="text-sm text-ink-muted">
          Đây là điểm ước tính, không phải điểm JLPT chính thức: JLPT quy đổi điểm theo cách không công bố. Kết quả chưa
          tính phần Nghe nên chưa kết luận đỗ hay trượt.
        </p>
      </div>
    </Card>
  );
}
