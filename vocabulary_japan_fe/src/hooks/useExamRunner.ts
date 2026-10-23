import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { examsApi } from '@/api/examsApi';
import { isApiError } from '@/api/client';
import { toast } from '@/stores/toastStore';
import type {
  AttemptMondai,
  AttemptSection,
  AttemptState,
  Feedback,
  LearnerPassage,
  LearnerQuestion,
} from '@/types/exam';
import { enqueueAnswer, readQueue, removeSent, type PendingAnswer } from '@/utils/answerQueue';

export interface RunnerItem {
  question: LearnerQuestion;
  mondai: AttemptMondai;
  section: AttemptSection;
  passage: LearnerPassage | null;
}

export interface LocalAnswer {
  choice: number | null;
  flagged: boolean;
}

/** saved: mọi thay đổi đã lên server; saving: đang gửi; unsaved: mất mạng, sẽ gửi lại. */
export type SaveStatus = 'saved' | 'saving' | 'unsaved';

const RETRY_MS = 5000;
/** Thời gian ở câu chưa gửi quá mức này thì gửi kèm khi rời câu (để thống kê FR-EXP-09). */
const TIME_FLUSH_MS = 5000;
/** Một lần xem không tính quá 10 phút (máy để quên). */
const MAX_VIEW_MS = 10 * 60_000;
const POSITION_DELAY_MS = 1500;

const emptyAnswer: LocalAnswer = { choice: null, flagged: false };

function buildItems(sections: AttemptSection[]): RunnerItem[] {
  return sections.flatMap((section) =>
    (section.mondai ?? []).flatMap((mondai) =>
      mondai.questions.map((question) => ({
        question,
        mondai,
        section,
        passage: mondai.passages.find((p) => p.id === question.passage_id) ?? null,
      })),
    ),
  );
}

/** Đáp án của server, phủ bằng các thay đổi còn chờ gửi (mới hơn). */
function mergeAnswers(attempt: AttemptState): Record<string, LocalAnswer> {
  const result: Record<string, LocalAnswer> = {};
  for (const a of attempt.answers) result[a.question_id] = { choice: a.choice, flagged: a.flagged };
  for (const pending of Object.values(readQueue(attempt.id))) {
    const base = result[pending.question_id] ?? emptyAnswer;
    result[pending.question_id] = {
      choice: pending.choice !== undefined ? pending.choice : base.choice,
      flagged: pending.flagged ?? base.flagged,
    };
  }
  return result;
}

/** Tổng thời gian ở từng câu (server, hoặc bản chờ gửi nếu lớn hơn). */
function mergeTimes(attempt: AttemptState): Record<string, number> {
  const result: Record<string, number> = {};
  for (const a of attempt.answers) result[a.question_id] = a.time_spent_ms;
  for (const pending of Object.values(readQueue(attempt.id))) {
    result[pending.question_id] = Math.max(result[pending.question_id] ?? 0, pending.time_spent_ms ?? 0);
  }
  return result;
}

/**
 * Điều phối màn hình làm bài (FR-RUN): phạm vi câu đang làm, đáp án cục bộ, hàng đợi lưu (gửi
 * ngay, mất mạng thì giữ trong localStorage và gửi lại), thời gian ở từng câu, câu đang xem.
 * `onSectionClosed` được gọi khi server báo phần đã nộp (hết giờ) để trang tải lại trạng thái.
 */
export function useExamRunner(attempt: AttemptState, onSectionClosed: () => unknown) {
  const attemptId = attempt.id;
  const timed = attempt.timed;

  // Bấm giờ: chỉ phần đang làm (đã bắt đầu, chưa nộp). Không bấm giờ: mọi phần.
  const activeSection = timed ? (attempt.sections.find((s) => s.started_at && !s.submitted_at) ?? null) : null;
  const scopeSections = useMemo(
    () => (timed ? (activeSection ? [activeSection] : []) : attempt.sections),
    [timed, activeSection, attempt.sections],
  );
  const items = useMemo(() => buildItems(scopeSections), [scopeSections]);

  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>(() => mergeAnswers(attempt));
  const [feedback, setFeedback] = useState<Record<string, Feedback>>(() =>
    Object.fromEntries(attempt.feedback.map((f) => [f.question_id, f])),
  );
  const [status, setStatus] = useState<SaveStatus>(() =>
    Object.keys(readQueue(attemptId)).length > 0 ? 'unsaved' : 'saved',
  );

  // Trạng thái mới từ server (bắt đầu phần, tải lại): dựng lại đáp án, giữ thay đổi còn chờ.
  useEffect(() => {
    setAnswers(mergeAnswers(attempt));
    setFeedback((current) => ({ ...current, ...Object.fromEntries(attempt.feedback.map((f) => [f.question_id, f])) }));
  }, [attempt]);

  const [currentId, setCurrentId] = useState<string | null>(() =>
    items.some((i) => i.question.id === attempt.current_question_id)
      ? attempt.current_question_id
      : (items[0]?.question.id ?? null),
  );
  // Sang phần mới: câu đang xem không còn trong phạm vi → về câu đầu.
  useEffect(() => {
    if (!items.some((i) => i.question.id === currentId)) setCurrentId(items[0]?.question.id ?? null);
  }, [items, currentId]);

  const currentIndex = Math.max(
    0,
    items.findIndex((i) => i.question.id === currentId),
  );
  const current = items[currentIndex] ?? null;

  // ---------- Hàng đợi lưu ----------

  const flushing = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout>>();
  const onClosedRef = useRef(onSectionClosed);
  useEffect(() => {
    onClosedRef.current = onSectionClosed;
  });

  const flush = useCallback(async (): Promise<boolean> => {
    if (flushing.current) return false;
    flushing.current = true;
    clearTimeout(retryTimer.current);
    try {
      let closed = false;
      for (;;) {
        const next: PendingAnswer | undefined = Object.values(readQueue(attemptId))[0];
        if (!next) break;
        setStatus('saving');
        try {
          const { changed_at, question_id, ...body } = next;
          const res = await examsApi.saveAnswer(attemptId, question_id, { ...body, changed_at });
          removeSent(attemptId, next);
          if (res.feedback) setFeedback((f) => ({ ...f, [question_id]: res.feedback! }));
          // Chế độ luyện: câu đã chấm giữ lựa chọn đầu, đồng bộ theo server.
          if (!timed) {
            setAnswers((a) => ({ ...a, [question_id]: { ...(a[question_id] ?? emptyAnswer), choice: res.answer.choice } }));
          }
        } catch (error) {
          const code = isApiError(error) ? error.code : null;
          const status = isApiError(error) ? error.status : 0;
          if (status === 0 || status === 429 || status >= 500) {
            setStatus('unsaved');
            retryTimer.current = setTimeout(() => void flush(), RETRY_MS);
            return false;
          }
          removeSent(attemptId, next);
          if (code === 'SECTION_TIME_UP' || code === 'ATTEMPT_SUBMITTED') closed = true;
          else toast.error(isApiError(error) ? error.message : 'Chưa lưu được câu trả lời');
        }
      }
      setStatus('saved');
      if (closed) onClosedRef.current();
      return true;
    } finally {
      flushing.current = false;
    }
  }, [attemptId, timed]);

  // Còn thay đổi chưa gửi từ lần trước (mất mạng, đóng trình duyệt): gửi ngay khi mở lại.
  useEffect(() => {
    void flush();
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
      clearTimeout(retryTimer.current);
    };
  }, [flush]);

  // ---------- Thời gian ở từng câu ----------

  const times = useRef<Record<string, number>>(mergeTimes(attempt));
  useEffect(() => {
    const fresh = mergeTimes(attempt);
    for (const [id, ms] of Object.entries(fresh)) times.current[id] = Math.max(times.current[id] ?? 0, ms);
  }, [attempt]);
  const view = useRef<{ id: string | null; since: number | null; unsent: number }>({ id: null, since: null, unsent: 0 });

  /** Cộng thời gian đang xem vào câu đó; trả về tổng mới. */
  const settleTime = useCallback((questionId: string) => {
    const v = view.current;
    if (v.id === questionId && v.since !== null) {
      const elapsed = Math.min(Date.now() - v.since, MAX_VIEW_MS);
      v.since = Date.now();
      v.unsent += elapsed;
      times.current[questionId] = (times.current[questionId] ?? 0) + elapsed;
    }
    return times.current[questionId] ?? 0;
  }, []);

  const save = useCallback(
    (questionId: string, patch: Partial<LocalAnswer>) => {
      const total = settleTime(questionId);
      view.current.unsent = 0;
      setAnswers((a) => ({ ...a, [questionId]: { ...(a[questionId] ?? emptyAnswer), ...patch } }));
      enqueueAnswer(attemptId, { question_id: questionId, ...patch, time_spent_ms: total });
      setStatus('saving');
      void flush();
    },
    [attemptId, flush, settleTime],
  );

  // Đổi câu: chốt thời gian câu cũ (gửi nếu đủ lâu), bắt đầu tính câu mới; lưu câu đang xem.
  useEffect(() => {
    if (!currentId) return;
    view.current = { id: currentId, since: document.visibilityState === 'visible' ? Date.now() : null, unsent: 0 };
    const timer = setTimeout(() => {
      if (!Object.keys(readQueue(attemptId)).includes(currentId)) {
        void examsApi.savePosition(attemptId, currentId).catch(() => undefined);
      }
    }, POSITION_DELAY_MS);
    return () => {
      clearTimeout(timer);
      const total = settleTime(currentId);
      if (view.current.unsent >= TIME_FLUSH_MS) {
        enqueueAnswer(attemptId, { question_id: currentId, time_spent_ms: total });
        void flush();
      }
      view.current = { id: null, since: null, unsent: 0 };
    };
  }, [attemptId, currentId, flush, settleTime]);

  // Ẩn tab thì ngừng tính giờ cho câu đang xem.
  useEffect(() => {
    const onVisibility = () => {
      const v = view.current;
      if (!v.id) return;
      if (document.visibilityState === 'hidden') {
        settleTime(v.id);
        v.since = null;
      } else {
        v.since = Date.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [settleTime]);

  // ---------- Điều hướng ----------

  const goTo = useCallback((questionId: string) => setCurrentId(questionId), []);
  const goBy = useCallback(
    (delta: number) => {
      const target = items[currentIndex + delta];
      if (target) setCurrentId(target.question.id);
    },
    [items, currentIndex],
  );

  const select = useCallback(
    (choice: number) => {
      if (!current) return;
      const id = current.question.id;
      if (!timed && feedback[id]) return; // chế độ luyện: đã chấm thì khóa
      save(id, { choice });
    },
    [current, timed, feedback, save],
  );

  const toggleFlag = useCallback(() => {
    if (!current) return;
    const id = current.question.id;
    save(id, { flagged: !(answers[id]?.flagged ?? false) });
  }, [current, answers, save]);

  const counts = useMemo(() => {
    let answered = 0;
    let flagged = 0;
    for (const item of items) {
      const a = answers[item.question.id];
      if (a?.choice) answered += 1;
      if (a?.flagged) flagged += 1;
    }
    return { total: items.length, answered, unanswered: items.length - answered, flagged };
  }, [items, answers]);

  /** Gửi hết thay đổi trước khi nộp. false = còn câu chưa lưu được (mất mạng). */
  const flushAll = useCallback(async () => {
    if (current) {
      const total = settleTime(current.question.id);
      if (view.current.unsent > 0) {
        enqueueAnswer(attemptId, { question_id: current.question.id, time_spent_ms: total });
        view.current.unsent = 0;
      }
    }
    // Đợi lượt gửi đang chạy (nếu có) xong rồi gửi phần còn lại.
    for (let i = 0; i < 20 && flushing.current; i++) await new Promise((r) => setTimeout(r, 100));
    await flush();
    return Object.keys(readQueue(attemptId)).length === 0;
  }, [attemptId, current, flush, settleTime]);

  return {
    timed,
    activeSection,
    items,
    current,
    currentIndex,
    answers,
    feedback,
    status,
    counts,
    goTo,
    goBy,
    select,
    toggleFlag,
    flushAll,
  };
}
