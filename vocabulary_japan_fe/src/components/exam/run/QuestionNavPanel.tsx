import { Flag } from 'lucide-react';
import type { LocalAnswer, RunnerItem } from '@/hooks/useExamRunner';
import type { Feedback } from '@/types/exam';
import { cn } from '@/utils/cn';

/**
 * Bảng điều hướng (FR-RUN-06): mọi câu của phạm vi đang làm, nhóm theo mondai, mỗi ô một trạng
 * thái — chưa làm, đã làm, đánh dấu xem lại (và đúng/sai ở chế độ luyện). Bấm số để nhảy tới câu.
 */
export function QuestionNavPanel({
  items,
  answers,
  feedback,
  currentId,
  onSelect,
}: {
  items: RunnerItem[];
  answers: Record<string, LocalAnswer>;
  feedback: Record<string, Feedback>;
  currentId: string | null;
  onSelect: (questionId: string) => void;
}) {
  const groups: { key: string; label: string; items: RunnerItem[] }[] = [];
  for (const item of items) {
    const key = `${item.section.id}:${item.mondai.id}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else {
      const sectionLabel = items.some((i) => i.section.id !== item.section.id) ? `${item.section.title} · ` : '';
      groups.push({ key, label: `${sectionLabel}問題${item.mondai.number}`, items: [item] });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted" aria-label="Chú giải">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 border border-rule-strong bg-surface" /> Chưa làm
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 bg-ink" /> Đã làm
        </li>
        <li className="flex items-center gap-1.5">
          <Flag aria-hidden="true" className="size-3 text-son" /> Xem lại
        </li>
      </ul>
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h3 lang="ja" className="mb-2 font-jp text-sm font-medium">
            {group.label}
          </h3>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
            {group.items.map(({ question }) => {
              const answer = answers[question.id];
              const result = feedback[question.id];
              const answered = Boolean(answer?.choice);
              const current = question.id === currentId;
              const state = [
                answered ? 'đã làm' : 'chưa làm',
                answer?.flagged ? 'đánh dấu xem lại' : null,
                result ? (result.is_correct ? 'đúng' : 'sai') : null,
              ]
                .filter(Boolean)
                .join(', ');
              return (
                <li key={question.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(question.id)}
                    aria-current={current ? 'step' : undefined}
                    aria-label={`Câu ${question.number}, ${state}`}
                    className={cn(
                      'relative flex h-11 w-full items-center justify-center border font-sans text-sm font-semibold tabular-nums',
                      result
                        ? result.is_correct
                          ? 'border-moss bg-moss-wash text-moss-ink'
                          : 'border-son bg-son-wash text-son-ink'
                        : answered
                          ? 'border-ink bg-ink text-paper'
                          : 'border-rule-strong bg-surface',
                      current && 'outline-2 outline-offset-2 outline-son',
                    )}
                  >
                    {question.number}
                    {answer?.flagged && (
                      <Flag aria-hidden="true" className="absolute right-0.5 top-0.5 size-3 fill-son text-son" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
