import { Search, Star } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { controlClasses } from '@/components/ui/field';
import { Select } from '@/components/ui/Select';
import { useDebounce } from '@/hooks/useDebounce';
import type { WordFilters as Filters } from '@/hooks/queries/useWords';
import type { WordParam } from '@/hooks/useWordFilters';
import { JLPT_LEVELS, WORD_STATUSES, WORD_STATUS_LABELS, type Topic } from '@/types/word';
import { cn } from '@/utils/cn';

interface WordFiltersProps {
  filters: Filters;
  topics: Topic[];
  onChange: (patch: Partial<Record<WordParam, string | null>>) => void;
  /** Nội dung ô tìm kiếm (trang giữ state, để "Xóa bộ lọc" xóa được ngay). */
  searchText: string;
  onSearchTextChange: (value: string) => void;
}

/** Ô tìm kiếm (debounce 300 ms) và các bộ lọc; mọi thay đổi ghi lên URL qua onChange. */
export function WordFilters({
  filters,
  topics,
  onChange,
  searchText,
  onSearchTextChange,
}: WordFiltersProps) {
  const debounced = useDebounce(searchText, 300);

  // Đọc giá trị mới nhất qua ref để effect chỉ chạy khi chuỗi đã debounce thay đổi.
  const latest = useRef({ q: filters.q ?? '', onChange });
  useEffect(() => {
    latest.current = { q: filters.q ?? '', onChange };
  });
  useEffect(() => {
    const value = debounced.trim();
    if (value !== latest.current.q) latest.current.onChange({ q: value || null });
  }, [debounced]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <label htmlFor="word-search" className="sr-only">
          Tìm từ
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
        />
        <input
          id="word-search"
          type="search"
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          placeholder="Tìm theo chữ Nhật, romaji hoặc nghĩa"
          autoComplete="off"
          className={cn(controlClasses, 'pl-10')}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
        <Select
          label="Cấp độ"
          hideLabel
          value={filters.level ?? ''}
          onChange={(e) => onChange({ level: e.target.value || null })}
          options={[
            { value: '', label: 'Cấp độ' },
            ...JLPT_LEVELS.map((l) => ({ value: l, label: l })),
          ]}
        />
        <Select
          label="Chủ đề"
          hideLabel
          value={filters.topic ?? ''}
          onChange={(e) => onChange({ topic: e.target.value || null })}
          options={[
            { value: '', label: 'Chủ đề' },
            ...topics.map((t) => ({ value: t.id, label: t.name_vi })),
          ]}
        />
        <Select
          label="Trạng thái"
          hideLabel
          value={filters.status ?? ''}
          onChange={(e) => onChange({ status: e.target.value || null })}
          options={[
            { value: '', label: 'Trạng thái' },
            ...WORD_STATUSES.map((s) => ({ value: s, label: WORD_STATUS_LABELS[s] })),
          ]}
        />
        <button
          type="button"
          aria-pressed={Boolean(filters.favorite)}
          onClick={() => onChange({ fav: filters.favorite ? null : '1' })}
          className={cn(
            'flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border px-3 text-sm font-medium',
            filters.favorite
              ? 'border-ink bg-surface text-ink'
              : 'border-rule-strong bg-surface text-ink-muted hover:text-ink',
          )}
        >
          <Star
            aria-hidden="true"
            className={cn('size-4', filters.favorite && 'fill-son text-son')}
          />
          Chỉ yêu thích
        </button>
      </div>
    </div>
  );
}
