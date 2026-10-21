import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash2 } from 'lucide-react';
import type { AdminSortField, SortOrder } from '@/types/api';
import { WORD_TYPE_LABELS, type Topic, type Word } from '@/types/word';
import { cn } from '@/utils/cn';

export interface SortState {
  sort: AdminSortField;
  order: SortOrder;
}

interface Column {
  label: string;
  /** Cột không có field thì không sắp xếp được. */
  field?: AdminSortField;
  className?: string;
}

const COLUMNS: Column[] = [
  { label: 'ID', field: 'id', className: 'w-16' },
  // Sắp theo cách đọc: ra thứ tự gojūon và xếp đúng cả từ không có kanji.
  { label: 'Chữ', field: 'kana' },
  { label: 'Romaji', field: 'romaji' },
  { label: 'Nghĩa chính' },
  { label: 'Loại từ', field: 'type' },
  { label: 'Cấp', field: 'level', className: 'w-16' },
  { label: 'Chủ đề', field: 'topic_id' },
];

const ariaSort = { asc: 'ascending', desc: 'descending' } as const;

interface AdminWordTableProps {
  words: Word[];
  topics: Topic[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  onEdit: (word: Word) => void;
  onDelete: (word: Word) => void;
  /** Đang tải trang/bộ lọc mới: làm mờ dữ liệu cũ. */
  stale?: boolean;
}

/**
 * Bảng từ vựng. Bấm tiêu đề cột để sắp xếp (bấm lần nữa đổi chiều), aria-sort báo cột
 * đang sắp xếp. Trên màn hình hẹp, bảng cuộn ngang trong khung riêng.
 */
export function AdminWordTable({
  words,
  topics,
  sort,
  onSortChange,
  onEdit,
  onDelete,
  stale,
}: AdminWordTableProps) {
  const topicName = (id: string) => topics.find((t) => t.id === id)?.name_vi ?? id;

  const toggleSort = (field: AdminSortField) =>
    onSortChange({
      sort: field,
      order: sort.sort === field && sort.order === 'asc' ? 'desc' : 'asc',
    });

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-rule bg-surface">
      <table
        className={cn(
          'w-full min-w-[760px] text-left text-sm transition-opacity',
          stale && 'opacity-60',
        )}
      >
        <caption className="sr-only">Danh sách từ vựng. Bấm tiêu đề cột để sắp xếp.</caption>
        <thead className="border-b border-rule-strong bg-paper">
          <tr>
            {COLUMNS.map((col) => {
              const active = col.field !== undefined && sort.sort === col.field;
              const Icon = !active ? ArrowUpDown : sort.order === 'asc' ? ArrowUp : ArrowDown;
              return (
                <th
                  key={col.label}
                  scope="col"
                  aria-sort={active ? ariaSort[sort.order] : undefined}
                  className={cn('px-3 py-2 font-semibold', col.className)}
                >
                  {col.field ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.field!)}
                      className={cn(
                        '-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-1 hover:bg-ink/5',
                        !active && 'text-ink-muted hover:text-ink',
                      )}
                    >
                      {col.label}
                      <Icon
                        aria-hidden="true"
                        className={cn('size-3.5', active ? 'text-son' : 'opacity-60')}
                      />
                    </button>
                  ) : (
                    <span className="text-ink-muted">{col.label}</span>
                  )}
                </th>
              );
            })}
            <th scope="col" className="w-24 px-3 py-2">
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {words.map((word) => {
            const name = word.kanji ?? word.kana;
            return (
              <tr key={word.id} className="border-b border-rule last:border-0 hover:bg-paper/60">
                <td className="px-3 py-2 tabular-nums text-ink-muted">{word.id}</td>
                <td className="px-3 py-2">
                  <span lang="ja" className="block font-jp text-base font-medium">
                    {name}
                  </span>
                  {word.kanji && (
                    <span lang="ja" className="block font-jp text-xs text-ink-muted">
                      {word.kana}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-ink-muted">{word.romaji}</td>
                <td className="max-w-56 truncate px-3 py-2" title={word.meanings_vi.join('; ')}>
                  {word.meanings_vi[0]}
                  {word.meanings_vi.length > 1 && (
                    <span className="text-ink-muted"> +{word.meanings_vi.length - 1}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-ink-muted">{WORD_TYPE_LABELS[word.type]}</td>
                <td className="px-3 py-2">{word.level}</td>
                <td className="px-3 py-2 text-ink-muted">{topicName(word.topic_id)}</td>
                <td className="px-3 py-1">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(word)}
                      aria-label={`Sửa ${name}`}
                      className="flex size-9 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-ink/5 hover:text-ink"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(word)}
                      aria-label={`Xóa ${name}`}
                      className="flex size-9 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-son-wash hover:text-son-ink"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
