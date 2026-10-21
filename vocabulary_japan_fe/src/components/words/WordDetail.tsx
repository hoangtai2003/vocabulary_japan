import { X } from 'lucide-react';
import { forwardRef } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { isApiError } from '@/api/client';
import { useWordDetail } from '@/hooks/queries/useWords';
import { WORD_TYPE_LABELS, type Topic, type WordWithState } from '@/types/word';
import { formatLongDate } from '@/utils/format';
import { FavoriteButton } from './FavoriteButton';
import { NoteEditor } from './NoteEditor';
import { StatusLabel } from './StatusLabel';

function formatDue(word: WordWithState): string {
  if (!word.due_at) return 'Chưa học';
  return formatLongDate(new Date(word.due_at));
}

/** Nội dung chi tiết một từ: cách đọc, nghĩa, thông tin học, câu ví dụ, ghi chú. */
export function WordDetailBody({ word, topics }: { word: WordWithState; topics: Topic[] }) {
  const topicName = topics.find((t) => t.id === word.topic_id)?.name_vi ?? word.topic_id;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p lang="ja" className="font-brush text-5xl font-semibold leading-tight">
            {word.kanji ?? word.kana}
          </p>
          <p className="mt-1 text-ink-muted">
            {word.kanji && (
              <span lang="ja" className="mr-2 font-jp text-ink">
                {word.kana}
              </span>
            )}
            {word.romaji}
          </p>
        </div>
        <FavoriteButton word={word} className="border border-rule" />
      </div>

      <ol className="flex flex-col gap-0.5">
        {word.meanings_vi.map((meaning, i) => (
          <li key={meaning} className={i === 0 ? 'text-xl font-semibold' : 'text-ink-muted'}>
            {word.meanings_vi.length > 1 && (
              <span className="mr-2 text-sm tabular-nums text-ink-muted">{i + 1}.</span>
            )}
            {meaning}
          </li>
        ))}
      </ol>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-y border-rule py-3 text-sm">
        <div>
          <dt className="text-ink-muted">Cấp độ</dt>
          <dd>{word.level}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Loại từ</dt>
          <dd>{WORD_TYPE_LABELS[word.type]}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Chủ đề</dt>
          <dd>{topicName}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Trạng thái</dt>
          <dd>
            <StatusLabel status={word.status} />
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-ink-muted">Lần ôn tới</dt>
          <dd>{formatDue(word)}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-0.5">
        <p lang="ja" className="font-jp text-lg">
          {word.example_jp}
        </p>
        <p lang="ja" className="font-jp text-sm text-ink-muted">
          {word.example_kana}
        </p>
        <p className="text-sm italic text-ink-muted">{word.example_romaji}</p>
        <p className="mt-1">{word.example_vi}</p>
      </div>

      <NoteEditor key={word.id} wordId={word.id} initialNote={word.note} />
    </div>
  );
}

export function WordDetailState({
  query,
  topics,
}: {
  query: ReturnType<typeof useWordDetail>;
  topics: Topic[];
}) {
  if (query.word) return <WordDetailBody word={query.word} topics={topics} />;
  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.status === 404;
    return (
      <ErrorState
        title={notFound ? 'Không tìm thấy từ này' : 'Chưa tải được chi tiết'}
        message={
          notFound
            ? 'Từ có thể đã bị xóa. Chọn một từ khác trong danh sách.'
            : 'Kiểm tra mạng rồi thử lại.'
        }
        onRetry={notFound ? undefined : () => void query.refetch()}
      />
    );
  }
  return (
    <SkeletonGroup label="Đang tải chi tiết từ" className="flex flex-col gap-4">
      <Skeleton className="h-14 w-32" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-28 w-full" />
    </SkeletonGroup>
  );
}

/** Panel chi tiết bên phải (desktop ≥ 1024px). */
export const WordDetailPanel = forwardRef<
  HTMLHeadingElement,
  { wordId: string; fromList: WordWithState | undefined; topics: Topic[]; onClose: () => void }
>(function WordDetailPanel({ wordId, fromList, topics, onClose }, headingRef) {
  const query = useWordDetail(wordId, fromList);
  return (
    <section
      aria-labelledby="word-detail-title"
      className="rounded-[var(--radius-card)] border border-rule bg-surface"
    >
      <div className="flex items-center justify-between border-b border-rule px-5 py-2">
        <h2
          id="word-detail-title"
          ref={headingRef}
          tabIndex={-1}
          className="font-sans text-sm font-semibold text-ink-muted outline-none"
        >
          Chi tiết từ
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết"
          className="-mr-2 flex size-10 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-ink/5 hover:text-ink"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className="p-5">
        <WordDetailState query={query} topics={topics} />
      </div>
    </section>
  );
});
