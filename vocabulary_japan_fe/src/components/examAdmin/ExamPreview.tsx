import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ExplanationView } from '@/components/exam/ExplanationView';
import { Markup } from '@/components/exam/Markup';
import { PassageView } from '@/components/exam/PassageView';
import { QuestionView } from '@/components/exam/QuestionView';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import type { AdminExam, AdminMondai, AdminPassage, AdminQuestion, AdminSection, LearnerQuestion, MondaiType } from '@/types/exam';
import { cn } from '@/utils/cn';

type Screen = 'run' | 'solution';
type Device = 'phone' | 'desktop';

interface Item {
  section: AdminSection;
  mondai: AdminMondai;
  question: AdminQuestion;
  passage: AdminPassage | null;
}

const toLearner = (q: AdminQuestion): LearnerQuestion => ({
  id: q.id,
  number: q.number,
  kind: q.kind,
  prompt: q.prompt,
  options: q.options,
  star_prefix: q.star_prefix,
  star_suffix: q.star_suffix,
  star_position: q.star_position,
  passage_id: q.passage_id,
  attachments: q.attachments,
});

function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-[var(--radius-control)] border border-rule-strong p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 rounded-[4px] px-3 text-sm font-medium',
            value === o.value ? 'bg-ink text-paper' : 'text-ink-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Một câu trong khung xem trước: bố cục giống màn hình làm bài (hoặc lời giải) của người học. */
function Frame({ item, screen, device, types }: { item: Item; screen: Screen; device: Device; types: MondaiType[] }) {
  const [tab, setTab] = useState<'passage' | 'question'>('question');
  const [selected, setSelected] = useState<number | null>(null);
  const q = item.question;
  const type = types.find((t) => t.id === item.mondai.type_id);
  const solution = screen === 'solution';

  const questionPane = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-b border-rule pb-3">
        <p lang="ja" className="font-jp text-sm font-semibold text-ink-muted">
          問題{item.mondai.number}
          {type && <span className="ml-2 font-sans font-normal">· {type.name_vi}</span>}
        </p>
        {item.mondai.instructions.trim() && <Markup source={item.mondai.instructions} className="text-[15px]" />}
      </div>
      <QuestionView
        question={toLearner(q)}
        selected={selected}
        onSelect={solution ? undefined : setSelected}
        correct={solution ? q.correct_option : undefined}
      />
      {solution && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-rule bg-surface p-4">
          {item.mondai.tip.trim() && (
            <details className="rounded-[var(--radius-control)] border border-rule px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold">Mẹo làm 問題{item.mondai.number}</summary>
              <Markup source={item.mondai.tip} lang="vi" className="mt-2 text-[15px]" />
            </details>
          )}
          <ExplanationView
            kind={q.kind}
            options={q.options}
            correctOption={q.correct_option}
            starOrder={q.star_order}
            starPosition={q.star_position}
            explanation={q.explanation}
            learnerNote={q.learner_note}
            preview
          />
        </div>
      )}
    </div>
  );

  const pad = 'px-4 py-5';
  if (!item.passage) return <div className={cn('h-full overflow-y-auto', pad)}>{questionPane}</div>;

  const passagePane = <PassageView passage={item.passage} activeBlank={q.number} showSolutionToggles={solution} />;
  if (device === 'desktop') {
    return (
      <div className="grid h-full grid-cols-2 divide-x divide-rule">
        <div className={cn('overflow-y-auto', pad)}>{passagePane}</div>
        <div className={cn('overflow-y-auto', pad)}>{questionPane}</div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <div role="tablist" aria-label="Bài đọc và câu hỏi" className="grid shrink-0 grid-cols-2 border-b border-rule">
        {(['passage', 'question'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn('relative h-11 text-sm font-semibold', tab === key ? 'text-ink' : 'text-ink-muted')}
          >
            {key === 'passage' ? 'Bài đọc' : `Câu hỏi ${q.number}`}
            <span aria-hidden="true" className={cn('absolute inset-x-6 bottom-0 h-0.5', tab === key ? 'bg-son' : 'bg-transparent')} />
          </button>
        ))}
      </div>
      <div className={cn('min-h-0 flex-1 overflow-y-auto', pad)}>{tab === 'passage' ? passagePane : questionPane}</div>
    </div>
  );
}

/**
 * Xem trước đề đúng như người học sẽ thấy (FR-CMS-11): một câu, một mondai hoặc cả đề; giao diện
 * điện thoại (360–390px) hoặc máy tính; màn hình làm bài hoặc màn hình lời giải. Dùng cho trình
 * soạn và trang nhập đề (FR-IMP-02).
 */
export function ExamPreview({
  exam,
  types,
  initialQuestionId,
  initialMondaiId,
}: {
  exam: AdminExam;
  types: MondaiType[];
  initialQuestionId?: string | null;
  initialMondaiId?: string | null;
}) {
  const [screen, setScreen] = useState<Screen>('run');
  const [device, setDevice] = useState<Device>('desktop');
  const [scope, setScope] = useState<string>(initialMondaiId ? `mondai:${initialMondaiId}` : 'all');

  const all = useMemo<Item[]>(
    () =>
      exam.sections.flatMap((section) =>
        section.mondai.flatMap((mondai) =>
          mondai.questions.map((question) => ({
            section,
            mondai,
            question,
            passage: mondai.passages.find((p) => p.id === question.passage_id) ?? null,
          })),
        ),
      ),
    [exam],
  );
  const items = scope === 'all' ? all : all.filter((i) => `mondai:${i.mondai.id}` === scope);
  const [currentId, setCurrentId] = useState<string | null>(initialQuestionId ?? null);
  const index = Math.max(0, items.findIndex((i) => i.question.id === currentId));
  const item = items[index];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Toggle
          label="Màn hình"
          value={screen}
          onChange={setScreen}
          options={[
            { value: 'run', label: 'Làm bài' },
            { value: 'solution', label: 'Lời giải' },
          ]}
        />
        <Toggle
          label="Thiết bị"
          value={device}
          onChange={setDevice}
          options={[
            { value: 'phone', label: 'Điện thoại' },
            { value: 'desktop', label: 'Máy tính' },
          ]}
        />
        <Select
          label="Phạm vi"
          hideLabel
          value={scope}
          onChange={(e) => {
            setScope(e.target.value);
            setCurrentId(null);
          }}
          containerClassName="min-w-56"
          options={[
            { value: 'all', label: `Cả đề (${all.length} câu)` },
            ...exam.sections.flatMap((s) =>
              s.mondai.map((m) => ({ value: `mondai:${m.id}`, label: `${s.title} · 問題${m.number} (${m.questions.length} câu)` })),
            ),
          ]}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={index === 0} onClick={() => setCurrentId(items[index - 1]!.question.id)}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span className="sr-only">Câu trước</span>
          </Button>
          <Select
            label="Câu"
            hideLabel
            value={item?.question.id ?? ''}
            onChange={(e) => setCurrentId(e.target.value)}
            options={items.map((i) => ({ value: i.question.id, label: `Câu ${i.question.number} · ${i.section.title}` }))}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={index >= items.length - 1}
            onClick={() => setCurrentId(items[index + 1]!.question.id)}
          >
            <ArrowRight aria-hidden="true" className="size-4" />
            <span className="sr-only">Câu sau</span>
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'mx-auto flex h-[720px] max-h-[80dvh] w-full flex-col overflow-hidden rounded-[var(--radius-card)] border-2 border-rule-strong bg-paper',
          device === 'phone' ? 'max-w-[390px]' : 'max-w-[1120px]',
        )}
      >
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-rule px-3">
          <p lang="ja" className="min-w-0 flex-1 truncate font-jp text-sm font-medium">
            {item?.section.title ?? exam.title}
          </p>
          {item?.section.duration_minutes && screen === 'run' && (
            <span className="border border-rule-strong px-2 py-0.5 font-semibold tabular-nums">{item.section.duration_minutes}:00</span>
          )}
        </div>
        <div className="min-h-0 flex-1">
          {item ? (
            <Frame key={`${item.question.id}-${screen}-${device}`} item={item} screen={screen} device={device} types={types} />
          ) : (
            <p className="p-6 text-ink-muted">Phạm vi này chưa có câu hỏi.</p>
          )}
        </div>
      </div>
    </div>
  );
}
