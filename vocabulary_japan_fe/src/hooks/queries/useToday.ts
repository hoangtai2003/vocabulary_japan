import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { wordsApi } from '@/api/wordsApi';

/** GET /words/today: từ mới hôm nay và tiến độ trong ngày. */
export function useToday() {
  return useQuery({
    queryKey: queryKeys.words.today,
    queryFn: ({ signal }) => wordsApi.today(signal),
  });
}
