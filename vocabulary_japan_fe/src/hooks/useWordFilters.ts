import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { WordFilters } from '@/hooks/queries/useWords';
import { JLPT_LEVELS, WORD_STATUSES, type JlptLevel, type WordStatus } from '@/types/word';

/** Tham số URL của trang Từ vựng. `tu` là id từ đang mở chi tiết. */
export type WordParam = 'q' | 'level' | 'topic' | 'status' | 'fav' | 'tu';

const FILTER_PARAMS: WordParam[] = ['q', 'level', 'topic', 'status', 'fav'];

/**
 * Bộ lọc của trang Từ vựng lưu trên URL query (?q=&level=&topic=&status=&fav=1&tu=), để chia
 * sẻ và quay lại được. Giá trị không hợp lệ trên URL bị bỏ qua.
 */
export function useWordFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<WordFilters>(() => {
    const result: WordFilters = {};
    const q = params.get('q')?.trim();
    const level = params.get('level');
    const topic = params.get('topic');
    const status = params.get('status');
    if (q) result.q = q;
    if (level && (JLPT_LEVELS as readonly string[]).includes(level))
      result.level = level as JlptLevel;
    if (topic) result.topic = topic;
    if (status && (WORD_STATUSES as readonly string[]).includes(status))
      result.status = status as WordStatus;
    if (params.get('fav') === '1') result.favorite = true;
    return result;
  }, [params]);

  /** Đổi một vài tham số; null hoặc '' là xóa. Mặc định thay thế lịch sử (không chồng bước Back). */
  const update = useCallback(
    (
      patch: Partial<Record<WordParam, string | null>>,
      { push = false }: { push?: boolean } = {},
    ) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(patch)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: !push },
      );
    },
    [setParams],
  );

  const clear = useCallback(
    () => update(Object.fromEntries(FILTER_PARAMS.map((p) => [p, null]))),
    [update],
  );

  const hasActiveFilters = Object.keys(filters).length > 0;

  return { filters, hasActiveFilters, selectedId: params.get('tu'), update, clear };
}
