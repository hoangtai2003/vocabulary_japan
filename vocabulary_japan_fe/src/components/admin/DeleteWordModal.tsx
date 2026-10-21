import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useDeleteWord } from '@/hooks/queries/useAdminWords';
import { toast } from '@/stores/toastStore';
import type { Word } from '@/types/word';

/** Hộp thoại xác nhận xóa một từ khỏi kho chung. */
export function DeleteWordModal({
  word,
  onClose,
  onDeleted,
}: {
  word: Word;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const deleteWord = useDeleteWord();
  const label = word.kanji ? `${word.kanji} (${word.kana})` : word.kana;

  const confirm = () =>
    deleteWord.mutate(word.id, {
      onSuccess: () => {
        toast.success(`Đã xóa ${word.kanji ?? word.kana}.`);
        onDeleted?.();
        onClose();
      },
      onError: () => toast.error('Chưa xóa được từ này. Thử lại nhé.'),
    });

  return (
    <Modal
      open
      onClose={onClose}
      title="Xóa từ này?"
      size="sm"
      dismissible={!deleteWord.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={deleteWord.isPending}>
            Giữ lại
          </Button>
          <Button variant="danger" onClick={confirm} loading={deleteWord.isPending}>
            {deleteWord.isPending ? 'Đang xóa…' : 'Xóa từ'}
          </Button>
        </>
      }
    >
      <p>
        <span lang="ja" className="font-jp text-lg font-semibold">
          {label}
        </span>
        <span className="text-ink-muted"> — {word.meanings_vi[0]}</span>
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        Tiến độ và ghi chú của mọi người học với từ này cũng bị xóa. Không thể hoàn tác.
      </p>
    </Modal>
  );
}
