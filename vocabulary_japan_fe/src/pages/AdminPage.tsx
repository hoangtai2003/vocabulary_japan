import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { AdminTableSkeleton } from '@/components/admin/AdminTableSkeleton';
import { AdminWordTable, type SortState } from '@/components/admin/AdminWordTable';
import { DeleteWordModal } from '@/components/admin/DeleteWordModal';
import { Pagination } from '@/components/admin/Pagination';
import { WordFormModal } from '@/components/admin/WordFormModal';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { controlClasses } from '@/components/ui/field';
import { Select } from '@/components/ui/Select';
import { useAdminWords } from '@/hooks/queries/useAdminWords';
import { useTopics } from '@/hooks/queries/useWords';
import { useDebounce } from '@/hooks/useDebounce';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { JLPT_LEVELS, type JlptLevel, type Word } from '@/types/word';
import { cn } from '@/utils/cn';

const PAGE_SIZE = 20;

/** Modal đang mở: thêm/sửa (word null = thêm), xóa. */
type Dialog = { kind: 'form'; word: Word | null } | { kind: 'delete'; word: Word } | null;

export default function AdminPage() {
  useDocumentTitle('Quản trị');
  const [searchText, setSearchText] = useState('');
  const q = useDebounce(searchText.trim(), 300);
  const [level, setLevel] = useState<JlptLevel | ''>('');
  const [topic, setTopic] = useState('');
  const [sort, setSort] = useState<SortState>({ sort: 'id', order: 'asc' });
  // Trang gắn với bộ lọc: đổi từ khóa, bộ lọc hoặc cách sắp xếp thì tự về trang 1.
  const filterKey = JSON.stringify([q, level, topic, sort]);
  const [paging, setPaging] = useState({ key: filterKey, page: 1 });
  const page = paging.key === filterKey ? paging.page : 1;
  const setPage = (next: number) => setPaging({ key: filterKey, page: next });
  const [dialog, setDialog] = useState<Dialog>(null);

  const topics = useTopics();
  const words = useAdminWords({
    q: q || undefined,
    level: level || undefined,
    topic: topic || undefined,
    sort: sort.sort,
    order: sort.order,
    page,
    page_size: PAGE_SIZE,
  });

  const data = words.data;

  const hasFilters = Boolean(q || level || topic);
  const clearFilters = () => {
    setSearchText('');
    setLevel('');
    setTopic('');
  };

  const topicList = topics.data ?? [];

  let content;
  if (words.isPending) {
    content = <AdminTableSkeleton />;
  } else if (words.isError && !data) {
    content = (
      <ErrorState
        title="Chưa tải được kho từ"
        onRetry={() => void words.refetch()}
        retrying={words.isRefetching}
      />
    );
  } else if (!data || data.total === 0) {
    content = hasFilters ? (
      <EmptyState
        mark="無"
        title="Không có từ nào khớp"
        description="Thử từ khóa khác hoặc bỏ bớt bộ lọc. Tìm kiếm không phân biệt dấu."
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Xóa bộ lọc
          </Button>
        }
      />
    ) : (
      <EmptyState
        mark="空"
        title="Kho từ đang trống"
        description="Thêm từ đầu tiên để người học có từ mới mỗi ngày."
        action={<Button onClick={() => setDialog({ kind: 'form', word: null })}>Thêm từ</Button>}
      />
    );
  } else {
    content = (
      <div className="flex flex-col gap-4">
        {words.isError && (
          <ErrorState
            title="Chưa tải được trang này"
            message="Bảng đang hiện dữ liệu cũ."
            onRetry={() => void words.refetch()}
            retrying={words.isRefetching}
          />
        )}
        <AdminWordTable
          words={data.items}
          topics={topicList}
          sort={sort}
          onSortChange={setSort}
          onEdit={(word) => setDialog({ kind: 'form', word })}
          onDelete={(word) => setDialog({ kind: 'delete', word })}
          stale={words.isPlaceholderData}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Quản trị"
        description="Kho từ chung cho mọi người học. Sửa ở đây là ai cũng thấy."
        actions={
          <Button
            size="sm"
            onClick={() => setDialog({ kind: 'form', word: null })}
            disabled={!topics.data}
          >
            <Plus aria-hidden="true" className="size-4" />
            Thêm từ
          </Button>
        }
      />

      <section aria-label="Kho từ vựng" className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <label htmlFor="admin-search" className="sr-only">
              Tìm từ
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
            />
            <input
              id="admin-search"
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm theo chữ Nhật, romaji hoặc nghĩa"
              autoComplete="off"
              className={cn(controlClasses, 'pl-10')}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <Select
              label="Cấp độ"
              hideLabel
              value={level}
              onChange={(e) => setLevel(e.target.value as JlptLevel | '')}
              options={[
                { value: '', label: 'Mọi cấp độ' },
                ...JLPT_LEVELS.map((l) => ({ value: l, label: l })),
              ]}
            />
            <Select
              label="Chủ đề"
              hideLabel
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              options={[
                { value: '', label: 'Mọi chủ đề' },
                ...topicList.map((t) => ({ value: t.id, label: t.name_vi })),
              ]}
            />
          </div>
        </div>
        {content}
      </section>

      {dialog?.kind === 'form' && topics.data && (
        <WordFormModal word={dialog.word} topics={topicList} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteWordModal
          word={dialog.word}
          onClose={() => setDialog(null)}
          onDeleted={() => {
            // Vừa xóa từ cuối cùng của trang: lùi về trang trước.
            if (data?.items.length === 1 && page > 1) setPage(page - 1);
          }}
        />
      )}
    </>
  );
}
