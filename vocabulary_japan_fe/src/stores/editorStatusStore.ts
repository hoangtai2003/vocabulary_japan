import { create } from 'zustand';

/** Trạng thái tự lưu của từng ô/form đang mở trong trình soạn đề (FR-CMS-12). */
export type FieldSaveState = 'idle' | 'pending' | 'saving' | 'error';

interface EditorStatusState {
  states: Record<string, FieldSaveState>;
  set: (key: string, state: FieldSaveState) => void;
  remove: (key: string) => void;
}

export const useEditorStatusStore = create<EditorStatusState>((set) => ({
  states: {},
  set: (key, state) => set((s) => (s.states[key] === state ? s : { states: { ...s.states, [key]: state } })),
  remove: (key) =>
    set((s) => {
      if (!(key in s.states)) return s;
      const { [key]: _removed, ...rest } = s.states;
      return { states: rest };
    }),
}));

/** Tổng hợp cho thanh trên cùng: "Đã lưu", "Đang lưu…", "Chưa lưu". */
export function useEditorSaveSummary(): 'saved' | 'saving' | 'unsaved' {
  return useEditorStatusStore((s) => {
    const values = Object.values(s.states);
    if (values.includes('error')) return 'unsaved';
    if (values.includes('saving') || values.includes('pending')) return 'saving';
    return 'saved';
  });
}
