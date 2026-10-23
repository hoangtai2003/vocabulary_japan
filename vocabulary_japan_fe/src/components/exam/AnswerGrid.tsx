import type { ResultSection } from '@/types/exam';
import { cn } from '@/utils/cn';

/**
 * Bảng đáp án nhanh của cả đề (FR-RES-08), dạng lưới "câu – đáp án" như bản chữa đề. Ô câu sai
 * tô son; câu bỏ trống ghi "–" ở dòng đã chọn.
 */
export function AnswerGrid({ sections }: { sections: ResultSection[] }) {
  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => {
        const questions = section.mondai.flatMap((m) => m.questions);
        return (
          <div key={section.id}>
            <h3 lang="ja" className="mb-2 font-jp text-sm font-semibold">
              {section.title}
            </h3>
            <div className="overflow-x-auto">
              <table className="border-collapse text-sm tabular-nums">
                <caption className="sr-only">Đáp án đúng và đáp án đã chọn của {section.title}</caption>
                <tbody>
                  <tr>
                    <th scope="row" className="border border-rule bg-paper px-2 py-1 text-left font-medium">
                      Câu
                    </th>
                    {questions.map((q) => (
                      <th key={q.id} scope="col" className="min-w-8 border border-rule bg-paper px-1.5 py-1 font-medium">
                        {q.number}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="border border-rule px-2 py-1 text-left font-medium">
                      Đáp án
                    </th>
                    {questions.map((q) => (
                      <td key={q.id} className="border border-rule px-1.5 py-1 text-center font-semibold">
                        {q.correct_option ?? '–'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="border border-rule px-2 py-1 text-left font-medium">
                      Bạn chọn
                    </th>
                    {questions.map((q) => (
                      <td
                        key={q.id}
                        className={cn(
                          'border border-rule px-1.5 py-1 text-center',
                          q.is_correct ? 'text-moss-ink' : 'bg-son-wash text-son-ink',
                        )}
                      >
                        {q.chosen ?? '–'}
                        <span className="sr-only">{q.is_correct ? ', đúng' : ', sai'}</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
