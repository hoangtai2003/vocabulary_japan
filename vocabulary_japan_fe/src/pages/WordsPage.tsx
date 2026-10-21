import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { WordCard } from '@/components/words/WordCard';
import { WordDetailPanel, WordDetailState } from '@/components/words/WordDetail';
import { WordFilters } from '@/components/words/WordFilters';
import { WordsSkeleton } from '@/components/words/WordsSkeleton';
import { useInfiniteWords, useTopics, useWordDetail } from '@/hooks/queries/useWords';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useWordFilters } from '@/hooks/useWordFilters';
import type { Topic, WordWithState } from '@/types/word';
import { cn } from '@/utils/cn';

/** Panel bên phải chỉ dùng từ 1024px; hẹp hơn thì mở chi tiết dạng drawer. */
const WIDE_QUERY = '(min-width: 1024px)';

/** Drawer chi tiết cho màn hình hẹp. */
function WordDetailDrawer({
  wordId,
  fromList,
  topics,
  onClose,
}: {
  wordId: string;
  fromList: WordWithState | undefined;
  topics: Topic[];
  onClose: () => void;
}) {
  const query = useWordDetail(wordId, fromList);
  return (
    <Modal open onClose={onClose} title="Chi tiết từ" placement="sheet" size="lg">
      <WordDetailState query={query} topics={topics} />
    </Modal>
  );
}

/**
 * Tự tải trang kế khi phần cuối danh sách sắp lộ ra (IntersectionObserver). Nút "Tải thêm"
 * luôn có để dùng bằng bàn phím và cho trình duyệt không hỗ trợ.
 */
function useAutoLoadMore(enabled: boolean, load: () => void) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    const node = sentinelRef.current;
    if (!enabled || !node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadRef.current();
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);
  return sentinelRef;
}

export default function WordsPage() {
  useDocumentTitle('Từ vựng');
  const { filters, hasActiveFilters, selectedId, update, clear } = useWordFilters();
  const [searchText, setSearchText] = useState(filters.q ?? '');
  const wideScreen = useMediaQuery(WIDE_QUERY);
  const topics = useTopics();
  const words = useInfiniteWords(filters);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);

  const items = useMemo(() => words.data?.pages.flatMap((p) => p.items) ?? [], [words.data]);
  const total = words.data?.pages[0]?.total ?? 0;
  const selectedFromList = items.find((w) => w.id === selectedId);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = words;
  const sentinelRef = useAutoLoadMore(Boolean(hasNextPage) && !words.isFetchNextPageError, () => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  });

  // Desktop: mở từ mới thì đưa focus vào panel để đọc/gõ ghi chú ngay.
  useEffect(() => {
    if (wideScreen && selectedId) panelHeadingRef.current?.focus({ preventScroll: true });
  }, [wideScreen, selectedId]);

  const open = (id: string) => update({ tu: id }, { push: true });
  const close = () => update({ tu: null });
  const clearFilters = () => {
    clear();
    setSearchText('');
  };

  const topicList = topics.data ?? [];

  let list;
  if (words.isPending) {
    list = <WordsSkeleton />;
  } else if (words.isError && items.length === 0) {
    list = (
      <ErrorState
        title="Chưa tải được danh sách từ"
        onRetry={() => void words.refetch()}
        retrying={words.isRefetching}
      />
    );
  } else if (items.length === 0) {
    list = (
      <EmptyState
        mark="無"
        title={
          filters.favorite && Object.keys(filters).length === 1
            ? 'Bạn chưa có từ yêu thích'
            : 'Không có từ nào khớp'
        }
        description={
          filters.favorite && Object.keys(filters).length === 1
            ? 'Bấm ngôi sao ở một từ để lưu vào đây.'
            : 'Thử bỏ bớt bộ lọc hoặc tìm bằng từ khác. Tìm kiếm không phân biệt dấu.'
        }
        action={
          hasActiveFilters ? (
            <Button variant="secondary" onClick={clearFilters}>
              Xóa bộ lọc
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    list = (
      <>
        <ul
          className={cn(
            'border-t border-rule transition-opacity',
            words.isPlaceholderData && 'opacity-60',
          )}
        >
          {items.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              selected={word.id === selectedId}
              onOpen={() => open(word.id)}
            />
          ))}
        </ul>
        <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-6">
          {words.isFetchNextPageError ? (
            <ErrorState
              className="w-full"
              title="Chưa tải thêm được"
              onRetry={() => void fetchNextPage()}
              retrying={isFetchingNextPage}
            />
          ) : hasNextPage ? (
            <Button
              variant="secondary"
              onClick={() => void fetchNextPage()}
              loading={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Đang tải…' : 'Tải thêm từ'}
            </Button>
          ) : (
            <p className="text-sm text-ink-muted">Đã hiện hết {total} từ.</p>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Từ vựng" />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
        <section aria-label="Danh sách từ" className="flex min-w-0 flex-col gap-4">
          <WordFilters
            filters={filters}
            topics={topicList}
            onChange={update}
            searchText={searchText}
            onSearchTextChange={setSearchText}
          />
          <div className="flex min-h-6 items-center justify-between gap-3 text-sm text-ink-muted">
            <p aria-live="polite">{words.data ? `${total} từ` : ''}</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-semibold text-son-ink underline underline-offset-4"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
          {list}
        </section>

        {wideScreen && (
          <aside className="sticky top-10 max-h-[calc(100dvh-5rem)] overflow-y-auto">
            {selectedId ? (
              <WordDetailPanel
                ref={panelHeadingRef}
                wordId={selectedId}
                fromList={selectedFromList}
                topics={topicList}
                onClose={close}
              />
            ) : (
              <div className="rounded-[var(--radius-card)] border border-dashed border-rule-strong p-6 text-center text-sm text-ink-muted">
                Chọn một từ để xem chi tiết và viết ghi chú.
              </div>
            )}
          </aside>
        )}
      </div>

      {!wideScreen && selectedId && (
        <WordDetailDrawer
          wordId={selectedId}
          fromList={selectedFromList}
          topics={topicList}
          onClose={close}
        />
      )}
    </>
  );
}
