import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type FieldError } from 'react-hook-form';
import type { z } from 'zod';
import { FormAlert } from '@/components/auth/FormAlert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useCreateWord, useUpdateWord } from '@/hooks/queries/useAdminWords';
import { wordFormSchema, type WordFormValues } from '@/schemas/word';
import { toast } from '@/stores/toastStore';
import {
  JLPT_LEVELS,
  WORD_TYPES,
  WORD_TYPE_LABELS,
  type Topic,
  type Word,
  type WordInput,
} from '@/types/word';
import { applyApiErrors } from '@/utils/formErrors';

const FIELDS = [
  'kanji',
  'kana',
  'romaji',
  'meanings_vi',
  'type',
  'level',
  'topic_id',
  'example_jp',
  'example_kana',
  'example_romaji',
  'example_vi',
] as const satisfies readonly (keyof WordInput)[];

function toFormValues(word: Word | null, topics: Topic[]): WordFormValues {
  return {
    kanji: word?.kanji ?? '',
    kana: word?.kana ?? '',
    romaji: word?.romaji ?? '',
    meanings_vi: word?.meanings_vi.join('\n') ?? '',
    type: word?.type ?? 'noun',
    level: word?.level ?? 'N5',
    topic_id: word?.topic_id ?? topics[0]?.id ?? '',
    example_jp: word?.example_jp ?? '',
    example_kana: word?.example_kana ?? '',
    example_romaji: word?.example_romaji ?? '',
    example_vi: word?.example_vi ?? '',
  };
}

/**
 * Lỗi của ô nghĩa có thể nằm ở chính trường (thiếu nghĩa) hoặc ở một phần tử
 * (meanings_vi.2: nghĩa quá dài) — lấy thông báo đầu tiên tìm thấy.
 */
function firstMessage(error: FieldError | undefined): string | undefined {
  if (!error) return undefined;
  if (typeof error.message === 'string' && error.message) return error.message;
  for (const child of Object.values(error as unknown as Record<string, unknown>)) {
    if (child && typeof child === 'object' && 'message' in child) {
      const message = (child as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
  }
  return undefined;
}

interface WordFormModalProps {
  /** null: thêm từ mới. */
  word: Word | null;
  topics: Topic[];
  onClose: () => void;
}

/** Modal thêm/sửa từ, validate bằng schema dùng chung với kiểu Word (wordFormSchema). */
export function WordFormModal({ word, topics, onClose }: WordFormModalProps) {
  const createWord = useCreateWord();
  const updateWord = useUpdateWord();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WordFormValues, unknown, z.output<typeof wordFormSchema>>({
    resolver: zodResolver(wordFormSchema),
    defaultValues: toFormValues(word, topics),
  });

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      const saved = word
        ? await updateWord.mutateAsync({ id: word.id, input })
        : await createWord.mutateAsync(input);
      const label = saved.kanji ?? saved.kana;
      toast.success(word ? `Đã lưu thay đổi cho ${label}.` : `Đã thêm ${label}.`);
      onClose();
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={word ? `Sửa từ ${word.kanji ?? word.kana}` : 'Thêm từ'}
      size="lg"
      dismissible={!isSubmitting}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" form="word-form" loading={isSubmitting}>
            {isSubmitting ? 'Đang lưu…' : word ? 'Lưu thay đổi' : 'Thêm từ'}
          </Button>
        </>
      }
    >
      <form id="word-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formError} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Kanji"
            lang="ja"
            hint="Bỏ trống nếu chỉ viết bằng kana."
            data-autofocus
            error={errors.kanji?.message}
            {...register('kanji')}
          />
          <Input
            label="Cách đọc (kana)"
            lang="ja"
            error={errors.kana?.message}
            {...register('kana')}
          />
          <Input
            label="Romaji"
            autoCapitalize="none"
            spellCheck={false}
            hint="Hepburn, ví dụ gakkou."
            error={errors.romaji?.message}
            {...register('romaji')}
          />
        </div>
        <Textarea
          label="Nghĩa tiếng Việt"
          hint="Mỗi dòng một nghĩa. Dòng đầu là nghĩa chính."
          rows={3}
          className="min-h-20"
          error={firstMessage(errors.meanings_vi)}
          {...register('meanings_vi')}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Loại từ"
            error={errors.type?.message}
            options={WORD_TYPES.map((t) => ({ value: t, label: WORD_TYPE_LABELS[t] }))}
            {...register('type')}
          />
          <Select
            label="Cấp độ"
            error={errors.level?.message}
            options={JLPT_LEVELS.map((l) => ({ value: l, label: l }))}
            {...register('level')}
          />
          <Select
            label="Chủ đề"
            error={errors.topic_id?.message}
            options={topics.map((t) => ({ value: t.id, label: t.name_vi }))}
            {...register('topic_id')}
          />
        </div>
        <fieldset className="flex flex-col gap-4 border-t border-rule pt-4">
          <legend className="sr-only">Câu ví dụ</legend>
          <Input
            label="Câu ví dụ"
            lang="ja"
            error={errors.example_jp?.message}
            {...register('example_jp')}
          />
          <Input
            label="Câu ví dụ bằng kana"
            lang="ja"
            error={errors.example_kana?.message}
            {...register('example_kana')}
          />
          <Input
            label="Câu ví dụ bằng romaji"
            autoCapitalize="none"
            spellCheck={false}
            error={errors.example_romaji?.message}
            {...register('example_romaji')}
          />
          <Input
            label="Nghĩa câu ví dụ"
            error={errors.example_vi?.message}
            {...register('example_vi')}
          />
        </fieldset>
      </form>
    </Modal>
  );
}
