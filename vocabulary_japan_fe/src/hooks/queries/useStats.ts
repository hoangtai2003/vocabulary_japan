import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { DEFAULT_WEEKS, statsApi } from '@/api/statsApi';

export function useStatsOverview() {
  return useQuery({
    queryKey: queryKeys.stats.overview,
    queryFn: ({ signal }) => statsApi.overview(signal),
  });
}

export function useWeeklyStats(weeks: number = DEFAULT_WEEKS) {
  return useQuery({
    queryKey: queryKeys.stats.weekly(weeks),
    queryFn: ({ signal }) => statsApi.weekly(weeks, signal),
  });
}

/** from, to dạng YYYY-MM-DD */
export function useCalendarStats(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.stats.calendar(from, to),
    queryFn: ({ signal }) => statsApi.calendar(from, to, signal),
  });
}
