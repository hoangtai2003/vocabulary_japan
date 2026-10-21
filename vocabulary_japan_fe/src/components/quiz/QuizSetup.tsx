import type { FormEvent } from 'react';
import { FormAlert } from '@/components/auth/FormAlert';
import { Button } from '@/components/ui/Button';
import type { QuizCount, QuizMode, QuizStartRequest } from '@/types/api';
import { JLPT_LEVELS, type JlptLevel } from '@/types/word';
import { OptionGroup } from '@/components/ui/OptionGroup';

interface QuizSetupProps {
  value: QuizStartRequest;
  onChange: (value: QuizStartRequest) => void;
  onStart: () => void;
  starting: boolean;
  /** Lỗi theo trường từ API (ví dụ cấp độ chưa đủ từ). */
  fieldErrors?: Record<string, string>;
  formError?: string | null;
}

/** Bước 1: chọn chế độ, số câu, cấp độ. */
export function QuizSetup({
  value,
  onChange,
  onStart,
  starting,
  fieldErrors,
  formError,
}: QuizSetupProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onStart();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px]">Quiz</h1>
        <p className="mt-1 text-ink-muted">
          Mỗi câu bốn đáp án. Quiz chỉ để luyện, không ảnh hưởng lịch ôn của bạn.
        </p>
      </div>
      <FormAlert message={formError ?? null} />
      <OptionGroup<QuizMode>
        legend="Chế độ"
        name="mode"
        columns={2}
        value={value.mode}
        onChange={(mode) => onChange({ ...value, mode })}
        options={[
          { value: 'jp_vi', label: 'Nhật → Việt', hint: 'Xem chữ Nhật, chọn nghĩa' },
          { value: 'vi_jp', label: 'Việt → Nhật', hint: 'Xem nghĩa, chọn chữ Nhật' },
        ]}
        error={fieldErrors?.mode}
      />
      <OptionGroup<QuizCount>
        legend="Số câu"
        name="count"
        value={value.count}
        onChange={(count) => onChange({ ...value, count })}
        options={[10, 20, 30].map((n) => ({ value: n as QuizCount, label: `${n} câu` }))}
        error={fieldErrors?.count}
      />
      <OptionGroup<JlptLevel>
        legend="Cấp độ"
        name="level"
        value={value.level}
        onChange={(level) => onChange({ ...value, level })}
        options={JLPT_LEVELS.map((level) => ({ value: level, label: level }))}
        error={fieldErrors?.level}
      />
      <Button type="submit" size="lg" block loading={starting}>
        {starting ? 'Đang soạn đề…' : 'Bắt đầu'}
      </Button>
    </form>
  );
}
