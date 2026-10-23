import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useEditorStatusStore, type FieldSaveState } from '@/stores/editorStatusStore';

const DEFAULT_DELAY_MS = 700;

/** Các trường khác nhau giữa bản nháp và bản đã lưu (so bằng JSON). */
export function diffFields<T extends object>(draft: T, saved: T): Partial<T> {
  const changes: Partial<T> = {};
  for (const key of Object.keys(draft) as (keyof T)[]) {
    if (JSON.stringify(draft[key]) !== JSON.stringify(saved[key])) changes[key] = draft[key];
  }
  return changes;
}

/**
 * Tự lưu một form (FR-CMS-12): người soạn sửa bản nháp, sau `delay` ms không gõ thì gửi đúng các
 * trường đã đổi. Rời form (đổi mục đang soạn, rời trang) thì gửi ngay phần còn lại. Trạng thái
 * báo về editorStatusStore để thanh trên cùng hiện "Đã lưu / Đang lưu… / Chưa lưu".
 * `save` ném lỗi thì giữ bản nháp, trạng thái "error", thử lại ở lần sửa tiếp theo. `save` có thể trả
 * về phần thật sự đã lưu (khi chỉ lưu được một phần); không trả gì nghĩa là đã lưu hết `changes`.
 */
export function useAutosave<T extends object>(
  initial: T,
  save: (changes: Partial<T>) => Promise<Partial<T> | void>,
  delay = DEFAULT_DELAY_MS,
) {
  const key = useId();
  const [draft, setDraft] = useState(initial);
  const [state, setState] = useState<FieldSaveState>('idle');
  const [error, setError] = useState<unknown>(null);
  const saved = useRef(initial);
  const draftRef = useRef(draft);
  const saveRef = useRef(save);
  const inFlight = useRef<Promise<void> | null>(null);
  const setStatus = useEditorStatusStore((s) => s.set);
  const removeStatus = useEditorStatusStore((s) => s.remove);

  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    setStatus(key, state);
  }, [key, state, setStatus]);

  const run = useCallback(async () => {
    if (inFlight.current) await inFlight.current;
    const changes = diffFields(draftRef.current, saved.current);
    if (Object.keys(changes).length === 0) {
      setState('idle');
      return;
    }
    setState('saving');
    const attempt = (async () => {
      try {
        const persisted = (await saveRef.current(changes)) ?? changes;
        saved.current = { ...saved.current, ...persisted };
        setError(null);
        const remaining = diffFields(draftRef.current, saved.current);
        setState(Object.keys(remaining).length > 0 ? 'pending' : 'idle');
      } catch (e) {
        setError(e);
        setState('error');
      }
    })();
    inFlight.current = attempt;
    await attempt;
    inFlight.current = null;
  }, []);

  // Có thay đổi → chờ hết `delay` rồi lưu.
  useEffect(() => {
    if (Object.keys(diffFields(draft, saved.current)).length === 0) return;
    setState((s) => (s === 'saving' ? s : 'pending'));
    const timer = setTimeout(() => void run(), delay);
    return () => clearTimeout(timer);
  }, [draft, delay, run]);

  // Rời form: gửi ngay phần chưa lưu, rồi mới bỏ trạng thái khỏi store.
  useEffect(
    () => () => {
      void run().finally(() => removeStatus(key));
    },
    [key, run, removeStatus],
  );

  const update = useCallback((patch: Partial<T>) => setDraft((d) => ({ ...d, ...patch })), []);

  /** Bỏ thay đổi của một số trường (ví dụ không xác nhận chấm lại). */
  const revert = useCallback((fields: (keyof T)[]) => {
    setDraft((d) => {
      const next = { ...d };
      for (const f of fields) next[f] = saved.current[f];
      return next;
    });
  }, []);

  return { draft, update, state, error, flush: run, revert };
}
