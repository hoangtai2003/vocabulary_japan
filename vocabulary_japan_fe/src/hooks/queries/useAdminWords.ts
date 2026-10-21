import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { queryKeys } from '@/api/queryKeys';
import type { AdminWordsQuery, ImportFormat } from '@/types/api';
import type { WordInput } from '@/types/word';
import { downloadBlob } from '@/utils/download';

/** GET /admin/words, giữ trang cũ trong lúc tải trang mới. */
export function useAdminWords(params: AdminWordsQuery) {
  return useQuery({
    queryKey: queryKeys.admin.words.list(params),
    queryFn: ({ signal }) => adminApi.listWords(params, signal),
    placeholderData: keepPreviousData,
  });
}

/** Sau khi sửa kho từ: làm mới bảng quản trị và mọi dữ liệu từ vựng của người học. */
function useInvalidateWordData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.words.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.words.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all }),
    ]);
}

export function useCreateWord() {
  const invalidate = useInvalidateWordData();
  return useMutation({ mutationFn: adminApi.createWord, onSuccess: invalidate });
}

export function useUpdateWord() {
  const invalidate = useInvalidateWordData();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: WordInput }) => adminApi.updateWord(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteWord() {
  const invalidate = useInvalidateWordData();
  return useMutation({ mutationFn: adminApi.deleteWord, onSuccess: invalidate });
}

/** POST /admin/words/import. Gọi dry_run: true để xem trước, rồi dry_run: false để nhập. */
export function useImportWords() {
  const invalidate = useInvalidateWordData();
  return useMutation({
    mutationFn: adminApi.importWords,
    onSuccess: async (_result, variables) => {
      if (!variables.dry_run) await invalidate();
    },
  });
}

/** GET /admin/words/export rồi tải file về. */
export function useExportWords() {
  return useMutation({
    mutationFn: async (format: ImportFormat) => {
      const file = await adminApi.exportWords(format);
      downloadBlob(file.blob, file.filename);
      return file;
    },
  });
}
