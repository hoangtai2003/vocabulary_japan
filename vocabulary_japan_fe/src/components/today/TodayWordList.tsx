import { Seal } from '@/components/ui/Seal';
import type { WordWithState } from '@/types/word';
import { primaryMeaning } from '@/utils/quiz';

/** Danh sách từ mới hôm nay. Từ đã học (đã chấm ít nhất một lần) có con dấu 済. */
export function TodayWordList({ words }: { words: WordWithState[] }) {
  return (
    <ul className="border-t border-rule">
      {words.map((word) => {
        const learned = word.status !== 'new';
        return (
          <li key={word.id} className="flex min-h-14 items-center gap-4 border-b border-rule py-2">
            <div lang="ja" className="w-28 shrink-0 sm:w-36">
              <span className="block font-jp text-lg leading-tight">{word.kanji ?? word.kana}</span>
              {word.kanji && (
                <span className="block font-jp text-xs text-ink-muted">{word.kana}</span>
              )}
            </div>
            <p className={`min-w-0 flex-1 truncate ${learned ? 'text-ink-muted' : ''}`}>
              {primaryMeaning(word)}
            </p>
            {learned ? (
              <Seal char="済" label="Đã học" size="sm" />
            ) : (
              <span className="size-6 shrink-0" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
