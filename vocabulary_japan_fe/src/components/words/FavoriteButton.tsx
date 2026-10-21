import { Star } from 'lucide-react';
import { useToggleFavorite } from '@/hooks/queries/useWordMutations';
import { toast } from '@/stores/toastStore';
import type { WordWithState } from '@/types/word';
import { cn } from '@/utils/cn';

/** Nút yêu thích dạng bật/tắt (aria-pressed), cập nhật lạc quan; lỗi thì hoàn tác và báo. */
export function FavoriteButton({ word, className }: { word: WordWithState; className?: string }) {
  const toggle = useToggleFavorite();
  const label = word.kanji ?? word.kana;

  return (
    <button
      type="button"
      aria-pressed={word.is_favorite}
      aria-label={`Yêu thích ${label}`}
      onClick={() =>
        toggle.mutate(
          { wordId: word.id, isFavorite: !word.is_favorite },
          { onError: () => toast.error('Chưa lưu được mục yêu thích. Thử lại nhé.') },
        )
      }
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] hover:bg-ink/5',
        word.is_favorite ? 'text-son' : 'text-ink-muted hover:text-ink',
        className,
      )}
    >
      <Star aria-hidden="true" className={cn('size-5', word.is_favorite && 'fill-son')} />
    </button>
  );
}
