import { useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/Textarea';
import { useDebounce } from '@/hooks/useDebounce';
import { useSaveNote } from '@/hooks/queries/useWordMutations';
import { NOTE_MAX_LENGTH } from '@/schemas/account';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const statusText: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Đang lưu…',
  saved: 'Đã lưu',
  error: 'Chưa lưu được. Gõ tiếp hoặc bấm Thử lại.',
};

/**
 * Ô ghi chú tự lưu sau 800 ms ngừng gõ (optimistic qua useSaveNote), có chỉ báo "Đã lưu".
 * Đóng panel khi còn thay đổi chưa lưu thì lưu ngay. Dùng key={wordId} để mỗi từ có trạng thái riêng.
 */
export function NoteEditor({ wordId, initialNote }: { wordId: string; initialNote: string }) {
  const [text, setText] = useState(initialNote);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const debounced = useDebounce(text, 800);
  const saveNote = useSaveNote();
  const savedRef = useRef(initialNote);
  const textRef = useRef(text);
  const mutateRef = useRef(saveNote.mutate);
  useEffect(() => {
    textRef.current = text;
    mutateRef.current = saveNote.mutate;
  });

  const persist = (value: string, report: boolean) => {
    if (value === savedRef.current || value.length > NOTE_MAX_LENGTH) return;
    if (report) setStatus('saving');
    mutateRef.current(
      { wordId, note: value },
      {
        onSuccess: () => {
          savedRef.current = value;
          if (report) setStatus(textRef.current === value ? 'saved' : 'idle');
        },
        onError: () => report && setStatus('error'),
      },
    );
  };
  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });

  useEffect(() => {
    persistRef.current(debounced, true);
  }, [debounced]);

  // Đóng panel/chuyển từ khi chưa kịp tự lưu: lưu nốt (không cập nhật giao diện nữa).
  useEffect(() => () => persistRef.current(textRef.current, false), []);

  return (
    <div className="flex flex-col gap-1">
      <Textarea
        label="Ghi chú của bạn"
        value={text}
        maxLength={NOTE_MAX_LENGTH}
        placeholder="Mẹo nhớ, câu ví dụ của riêng bạn…"
        onChange={(e) => {
          setText(e.target.value);
          if (status !== 'saving') setStatus('idle');
        }}
      />
      <div className="flex min-h-6 items-center justify-between gap-3 text-xs">
        <p
          role="status"
          className={
            status === 'error'
              ? 'font-medium text-son-ink'
              : status === 'saved'
                ? 'text-moss-ink'
                : 'text-ink-muted'
          }
        >
          {statusText[status]}
          {status === 'error' && (
            <button
              type="button"
              onClick={() => persistRef.current(textRef.current, true)}
              className="ml-2 font-semibold underline underline-offset-2"
            >
              Thử lại
            </button>
          )}
        </p>
        <p className="tabular-nums text-ink-muted">
          {text.length}/{NOTE_MAX_LENGTH}
        </p>
      </div>
    </div>
  );
}
