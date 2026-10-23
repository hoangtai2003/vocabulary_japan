import { useState, type ReactNode } from 'react';
import { isApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { useAddWordToReviews } from '@/hooks/queries/useExams';
import { toast } from '@/stores/toastStore';
import type { AnswerKind, Explanation, LearnerVocabItem, VocabItem } from '@/types/exam';
import { formatStarOrder } from '@/utils/exam';
import { Markup } from './Markup';

export interface ExplanationViewProps {
  kind: AnswerKind;
  options: string[];
  correctOption: number | null;
  starOrder: number[];
  starPosition: number | null;
  /** Lời giải của người học (từ vựng có in_reviews) hoặc của quản trị viên (xem trước). */
  explanation: Omit<Explanation, 'vocab'> & { vocab: (VocabItem & Partial<Pick<LearnerVocabItem, 'in_reviews'>>)[] };
  learnerNote: string;
  /** Xem trước của quản trị viên: nút "Thêm vào ôn tập" chỉ hiển thị, không gọi API. */
  preview?: boolean;
}

function Part({ index, title, children }: { index: number; title: string; children: ReactNode }) {
  return (
    <section className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-paper font-sans text-xs font-semibold text-ink-muted ring-1 ring-rule"
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="mb-1 font-sans text-sm font-semibold text-ink-muted">{title}</h4>
        {children}
      </div>
    </section>
  );
}

function VocabButton({ wordId, inReviews, preview }: { wordId: string; inReviews: boolean; preview: boolean }) {
  const [added, setAdded] = useState(inReviews);
  const add = useAddWordToReviews();
  if (added) {
    return <span className="text-sm font-medium text-moss-ink">Đã có trong ôn tập</span>;
  }
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={add.isPending}
      disabled={preview}
      onClick={() =>
        add.mutate(wordId, {
          onSuccess: (res) => {
            setAdded(true);
            toast.success(res.already_in_reviews ? 'Từ này đã có trong ôn tập' : 'Đã thêm vào ôn tập, đến hạn hôm nay');
          },
          onError: (error) => toast.error(isApiError(error) ? error.message : 'Chưa thêm được. Thử lại nhé.'),
        })
      }
    >
      Thêm vào ôn tập
    </Button>
  );
}

/**
 * Lời giải 6 mục cố định như bản chữa đề (FR-EXP-02): đáp án, câu hoàn chỉnh kèm bản dịch, vì sao
 * đúng, vì sao các lựa chọn khác sai, ngữ pháp, từ vựng. Mục trống thì không hiển thị. Ghi chú cho
 * người học hiển thị nổi bật ở đầu (FR-EXP-06). Câu ★ có thêm thứ tự đúng của 4 mảnh (FR-EXP-03).
 */
export function ExplanationView({
  kind,
  options,
  correctOption,
  starOrder,
  starPosition,
  explanation: e,
  learnerNote,
  preview = false,
}: ExplanationViewProps) {
  const answer =
    e.answer.trim() || (correctOption ? `${correctOption} ${options[correctOption - 1] ?? ''}` : '');
  // Số mục cố định 1–6 như bản chữa đề, kể cả khi bỏ qua mục trống.
  const parts: { index: number; title: string; body: ReactNode }[] = [];

  if (answer) parts.push({ index: 1, title: 'Đáp án', body: <Markup source={answer} lang="vi" className="font-semibold" /> });
  if (e.full_sentence.trim() || e.translation_vi.trim() || kind === 'star') {
    parts.push({
      index: 2,
      title: 'Câu hoàn chỉnh',
      body: (
        <div className="flex flex-col gap-1">
          {e.full_sentence.trim() && <Markup source={e.full_sentence} />}
          {e.translation_vi.trim() && <Markup source={e.translation_vi} lang="vi" className="text-ink-muted" />}
          {kind === 'star' && starOrder.length === 4 && (
            <p className="text-sm">
              <span className="text-ink-muted">Thứ tự đúng: </span>
              <span className="font-semibold tabular-nums">{formatStarOrder(starOrder, starPosition)}</span>
            </p>
          )}
        </div>
      ),
    });
  }
  if (e.why_correct.trim()) parts.push({ index: 3, title: 'Vì sao đúng', body: <Markup source={e.why_correct} lang="vi" /> });
  if (e.why_wrong.trim()) {
    parts.push({ index: 4, title: 'Vì sao các lựa chọn khác sai', body: <Markup source={e.why_wrong} lang="vi" /> });
  }
  if (e.grammar.length > 0) {
    parts.push({
      index: 5,
      title: 'Ngữ pháp',
      body: (
        <ul className="flex flex-col gap-2">
          {e.grammar.map((g, index) => (
            <li key={index}>
              <Markup source={`**${g.pattern}**`} lang="vi" inline />
              {g.explanation && (
                <>
                  {' = '}
                  <Markup source={g.explanation} lang="vi" inline />
                </>
              )}
              {g.examples.map((example, i) => (
                <p key={i} className="mt-0.5 pl-3 text-[15px] text-ink-muted">
                  <span aria-hidden="true">例: </span>
                  <span className="sr-only">Ví dụ: </span>
                  <Markup source={example} lang="vi" inline />
                </p>
              ))}
            </li>
          ))}
        </ul>
      ),
    });
  }
  if (e.vocab.length > 0) {
    parts.push({
      index: 6,
      title: 'Từ vựng',
      body: (
        <ul className="divide-y divide-rule">
          {e.vocab.map((v, index) => (
            <li key={index} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
              <span lang="ja" className="font-jp text-lg">
                {v.word}
              </span>
              {v.reading && (
                <span lang="ja" className="font-jp text-ink-muted">
                  {v.reading}
                </span>
              )}
              <span className="min-w-0 flex-1">{v.meaning}</span>
              {v.word_id && <VocabButton wordId={v.word_id} inReviews={v.in_reviews ?? false} preview={preview} />}
            </li>
          ))}
        </ul>
      ),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {learnerNote.trim() && (
        <div role="note" className="border border-son/40 border-l-[3px] border-l-son bg-son-wash/50 px-3 py-2.5">
          <p className="text-sm font-semibold text-son-ink">Ghi chú cho người học</p>
          <Markup source={learnerNote} lang="vi" className="text-[15px]" />
        </div>
      )}
      {parts.map((part) => (
        <Part key={part.index} index={part.index} title={part.title}>
          {part.body}
        </Part>
      ))}
      {parts.length === 0 && !learnerNote.trim() && <p className="text-sm text-ink-muted">Câu này chưa có lời giải.</p>}
    </div>
  );
}
