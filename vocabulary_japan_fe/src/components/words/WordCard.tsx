import type { WordWithState } from '@/types/word';
import { cn } from '@/utils/cn';
import { primaryMeaning } from '@/utils/quiz';
import { FavoriteButton } from './FavoriteButton';
import { StatusLabel } from './StatusLabel';

interface WordCardProps {
  word: WordWithState;
  selected: boolean;
  onOpen: () => void;
}

/** Một dòng từ: chữ Nhật, nghĩa chính, cấp độ, trạng thái, nút yêu thích. Bấm để mở chi tiết. */
export function WordCard({ word, selected, onOpen }: WordCardProps) {
  return (
    <li className="relative flex items-center border-b border-rule">
      {selected && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 bg-son" />}
      <button
        type="button"
        onClick={onOpen}
        aria-current={selected || undefined}
        className={cn(
          'flex min-h-16 min-w-0 flex-1 items-center gap-4 py-2.5 pl-3 pr-2 text-left hover:bg-ink/[0.03]',
          selected && 'bg-ink/[0.04]',
        )}
      >
        <span lang="ja" className="w-24 shrink-0 sm:w-32">
          <span className="block font-jp text-lg leading-tight">{word.kanji ?? word.kana}</span>
          {word.kanji && <span className="block font-jp text-xs text-ink-muted">{word.kana}</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate">{primaryMeaning(word)}</span>
          <span className="mt-0.5 flex items-center gap-3 text-xs text-ink-muted">
            <span>{word.level}</span>
            <StatusLabel status={word.status} />
          </span>
        </span>
      </button>
      <FavoriteButton word={word} />
    </li>
  );
}
