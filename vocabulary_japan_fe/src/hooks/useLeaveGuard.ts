import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Hỏi xác nhận khi rời trang lúc `when` đúng: chặn điều hướng trong app (trả về blocker để
 * hiện hộp thoại) và cảnh báo của trình duyệt khi đóng tab/tải lại.
 */
export function useLeaveGuard(when: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [when]);

  return blocker;
}
