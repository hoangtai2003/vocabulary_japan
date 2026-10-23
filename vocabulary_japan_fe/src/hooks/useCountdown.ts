import { useEffect, useRef, useState } from 'react';

/**
 * Thời gian còn lại tới hạn nộp do server ghi (FR-RUN-03). Đồng hồ máy người học có thể lệch:
 * độ lệch = server_now − thời điểm trình duyệt nhận response (dataUpdatedAt), nên hiển thị bám
 * theo giờ server (NFR-EX-03). Tới 0 thì gọi onExpire đúng một lần.
 */
export function useCountdown(
  deadlineAt: string | null,
  serverNow: string,
  receivedAt: number,
  onExpire: () => void,
): number | null {
  const offset = Date.parse(serverNow) - receivedAt;
  const compute = () => (deadlineAt ? Math.max(0, Date.parse(deadlineAt) - (Date.now() + offset)) : null);
  const [remaining, setRemaining] = useState(compute);
  const expiredFor = useRef<string | null>(null);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!deadlineAt) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const next = Math.max(0, Date.parse(deadlineAt) - (Date.now() + offset));
      setRemaining(next);
      if (next === 0 && expiredFor.current !== deadlineAt) {
        expiredFor.current = deadlineAt;
        onExpireRef.current();
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [deadlineAt, offset]);

  return remaining;
}

/** 1490000 → "24:50"; trên 1 giờ thì "1:04:50". */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** Đọc cho trình đọc màn hình: "24 phút 50 giây". */
export function spokenClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
}
