import { useEffect, useRef, useState } from 'react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useGradeWord } from '@/hooks/queries/useReviews';
import { useTopics } from '@/hooks/queries/useWords';
import { completedCount, useSessionStore, type SessionKind } from '@/stores/sessionStore';
import type { Quality } from '@/types/api';
import type { WordWithState } from '@/types/word';
import { cn } from '@/utils/cn';
import { FlashCard, type CardStamp } from './FlashCard';
import { SessionSummary } from './SessionSummary';

/** Thời gian con dấu hiện trên thẻ trước khi sang thẻ kế. */
const STAMP_MS = 700;

interface StudySessionProps {
  kind: SessionKind;
  title: string;
  /** Danh sách thẻ; chỉ đọc một lần khi bắt đầu phiên. */
  words: WordWithState[];
  /** Ghi chú dưới tiêu đề (ví dụ phiên chỉ gồm 50 trên 63 thẻ). */
  note?: string;
}

/**
 * Phiên học dùng chung cho /hoc và /on-tap. Hàng đợi nằm trong sessionStore và được chụp lại
 * lúc bắt đầu, vì sau mỗi lần chấm reviews.due và words.today được tải lại.
 * Chấm điểm lỗi (mạng): giữ nguyên thẻ đang lật và báo lỗi, người dùng chấm lại được.
 */
export function StudySession({ kind, title, words, note }: StudySessionProps) {
  const [initialWords] = useState(words);
  const start = useSessionStore((s) => s.start);
  const reset = useSessionStore((s) => s.reset);
  const activeKind = useSessionStore((s) => s.kind);
  const queue = useSessionStore((s) => s.queue);
  const total = useSessionStore((s) => s.total);
  const flipped = useSessionStore((s) => s.flipped);
  const setFlipped = useSessionStore((s) => s.setFlipped);
  const advance = useSessionStore((s) => s.advance);
  const firstGrades = useSessionStore((s) => s.firstGrades);
  const showFurigana = useSessionStore((s) => s.showFurigana);
  const toggleFurigana = useSessionStore((s) => s.toggleFurigana);

  const grade = useGradeWord();
  const topics = useTopics();
  const [error, setError] = useState<string | null>(null);
  const [stamp, setStamp] = useState<CardStamp | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    start(kind, initialWords);
    return () => {
      mounted.current = false;
      reset();
    };
  }, [kind, initialWords, start, reset]);

  if (activeKind !== kind) return null;

  const current = queue[0];
  if (!current) return <SessionSummary kind={kind} firstGrades={firstGrades} />;

  const done = completedCount({ queue, total });
  const busy = grade.isPending || stamp !== null;

  const handleGrade = async (quality: Quality) => {
    if (busy) return;
    setError(null);
    try {
      const { word } = await grade.mutateAsync({ wordId: current.word.id, quality });
      const becameMastered = word.status === 'mastered' && current.word.status !== 'mastered';
      const nextStamp = becameMastered
        ? { char: '覚', label: 'Đã thuộc' }
        : quality === 5
          ? { char: '良', label: 'Dễ' }
          : null;
      if (nextStamp) {
        setStamp(nextStamp);
        await new Promise((resolve) => setTimeout(resolve, STAMP_MS));
        if (!mounted.current) return;
        setStamp(null);
      }
      advance(word, quality);
    } catch {
      if (mounted.current) setError('Chưa lưu được kết quả. Kiểm tra mạng rồi chấm lại thẻ này.');
    }
  };

  const topicName = topics.data?.find((t) => t.id === current.word.topic_id)?.name_vi;

  // Cả phiên nằm trong một cột rộng bằng thẻ, để tiêu đề, tiến độ, thẻ và nút thẳng hàng.
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px]">{title}</h1>
          {note && <p className="text-sm text-ink-muted">{note}</p>}
        </div>
        <button
          type="button"
          onClick={toggleFurigana}
          aria-pressed={showFurigana}
          className="flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-rule-strong px-3 text-sm"
        >
          <span
            aria-hidden="true"
            className={cn(
              'size-3 border border-ink',
              showFurigana ? 'bg-son border-son' : 'bg-transparent',
            )}
          />
          Furigana
        </button>
      </div>

      <div className="flex items-center gap-3">
        <ProgressBar
          value={done}
          max={total}
          label="Tiến độ phiên"
          valueText={`Đã xong ${done} trên ${total} thẻ`}
        />
        <p className="shrink-0 text-sm tabular-nums text-ink-muted" aria-hidden="true">
          {Math.min(done + 1, total)} / {total}
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="border border-son/40 border-l-[3px] border-l-son bg-son-wash/60 px-3 py-2.5 text-sm font-medium"
        >
          {error}
        </p>
      )}

      <FlashCard
        key={current.word.id + (current.requeued ? ':lai' : '')}
        word={current.word}
        flipped={flipped}
        onFlip={() => setFlipped(!flipped)}
        onGrade={(q) => void handleGrade(q)}
        showFurigana={showFurigana}
        topicName={topicName}
        busy={busy}
        stamp={stamp}
        positionLabel={`Thẻ ${Math.min(done + 1, total)} trên ${total}${current.requeued ? ', ôn lại' : ''}`}
      />
      {current.requeued && (
        <p className="text-center text-sm text-ink-muted">Thẻ này quay lại vì bạn chọn "Quên".</p>
      )}
      <p className="hidden text-center text-xs text-ink-muted md:block">
        Phím tắt: Space lật thẻ · 1 Quên · 2 Khó · 3 Được · 4 Dễ · ← Quên · → Được
      </p>
    </div>
  );
}
