import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { Seal } from '@/components/ui/Seal';
import type { QuizMode, QuizQuestion, QuizResult as QuizResultData } from '@/types/api';

/** Dấu chấm điểm kiểu trường học Nhật: 優 (giỏi), 良 (khá), 可 (đạt). */
function gradeSeal(percent: number): { char: string; label: string } | null {
  if (percent >= 90) return { char: '優', label: 'Giỏi' };
  if (percent >= 70) return { char: '良', label: 'Khá' };
  if (percent >= 50) return { char: '可', label: 'Đạt' };
  return null;
}

interface QuizResultProps {
  result: QuizResultData;
  questions: QuizQuestion[];
  mode: QuizMode;
  onRetry: () => void;
  retrying: boolean;
  onChangeSetup: () => void;
}

/** Bước 3: điểm, số câu đúng, danh sách câu sai, làm lại cùng cấu hình. */
export function QuizResult({
  result,
  questions,
  mode,
  onRetry,
  retrying,
  onChangeSetup,
}: QuizResultProps) {
  const seal = gradeSeal(result.score_percent);
  const promptById = new Map(questions.map((q) => [q.id, q.prompt]));
  const promptLang = mode === 'jp_vi' ? 'ja' : 'vi';
  const answerLang = mode === 'jp_vi' ? 'vi' : 'ja';

  return (
    <section
      aria-labelledby="quiz-result"
      className="mx-auto flex w-full max-w-[560px] animate-page-in flex-col gap-6"
    >
      <div className="flex items-center gap-5">
        <p className="font-display text-6xl font-semibold tabular-nums">
          {result.score_percent}
          <span className="text-3xl">%</span>
        </p>
        {seal && <Seal char={seal.char} label={seal.label} size="lg" className="animate-stamp" />}
      </div>
      <div>
        <h1 id="quiz-result" className="text-[28px]">
          Bạn đúng {result.correct}/{result.total} câu
        </h1>
        <p className="mt-1 text-ink-muted">
          {result.wrong.length === 0
            ? 'Không sai câu nào. Thử tăng số câu hoặc cấp độ nhé.'
            : 'Xem lại các câu sai bên dưới, rồi làm lại để nhớ chắc hơn.'}
        </p>
      </div>

      {result.wrong.length > 0 && (
        <section aria-labelledby="wrong-list">
          <h2 id="wrong-list" className="mb-2 text-xl">
            Câu sai
          </h2>
          <ul className="border-t border-rule">
            {result.wrong.map((item) => (
              <li key={item.question_id} className="flex flex-col gap-1 border-b border-rule py-3">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span
                    lang={promptLang}
                    className={promptLang === 'ja' ? 'font-jp text-xl' : 'text-lg font-semibold'}
                  >
                    {promptById.get(item.question_id) ?? item.word.kanji ?? item.word.kana}
                  </span>
                  {/* Kèm cách đọc để phần kết quả cũng là một lượt ôn. */}
                  <span lang="ja" className="font-jp text-sm text-ink-muted">
                    {item.word.kanji ? `${item.word.kana} · ` : ''}
                    <span lang="vi">{item.word.romaji}</span>
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-ink-muted">Bạn chọn: </span>
                  <span lang={answerLang} className="text-son-ink line-through decoration-1">
                    {item.chosen_text || 'Chưa trả lời'}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-ink-muted">Đáp án: </span>
                  <span lang={answerLang} className="font-semibold text-moss-ink">
                    {item.correct_text}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" onClick={onRetry} loading={retrying} className="sm:flex-1">
          Làm lại
        </Button>
        <Button size="lg" variant="secondary" onClick={onChangeSetup} className="sm:flex-1">
          Đổi cấu hình
        </Button>
      </div>
      <Link to="/" className={buttonClasses({ variant: 'ghost', className: 'self-center' })}>
        Về Hôm nay
      </Link>
    </section>
  );
}
