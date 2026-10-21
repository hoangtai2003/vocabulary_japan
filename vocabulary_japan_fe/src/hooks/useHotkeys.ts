import { useEffect, useRef } from 'react';

export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

/** Phần tử đang nhận chữ: không bắt phím tắt khi người dùng đang gõ. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type;
    return !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(type);
  }
  return false;
}

/**
 * Gắn phím tắt toàn trang. Khóa của `keys` là giá trị KeyboardEvent.key
 * (' ' cho Space, 'Enter', 'ArrowLeft', '1'...).
 *
 * Quy tắc xử lý:
 * - Bỏ qua khi đang gõ trong ô nhập, khi giữ Ctrl/Alt/Meta (để không chặn phím tắt của
 *   trình duyệt), khi phím đang được giữ lặp lại, và khi có hộp thoại đang mở
 *   (aria-modal) mà phím không xảy ra bên trong nó.
 * - Space và Enter khi focus đang ở một nút/liên kết thì để trình duyệt tự kích hoạt phần tử
 *   đó, tránh chạy hai lần.
 * - Phím khớp thì gọi preventDefault (Space không cuộn trang).
 * Hàm xử lý được đọc qua ref nên truyền object mới mỗi lần render không gắn lại sự kiện.
 */
export function useHotkeys(keys: HotkeyMap, enabled = true): void {
  const keysRef = useRef(keys);
  useEffect(() => {
    keysRef.current = keys;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;
      const modal = document.querySelector('[aria-modal="true"]');
      if (modal && !(event.target instanceof Node && modal.contains(event.target))) return;

      const handler = keysRef.current[event.key];
      if (!handler) return;

      const activatesFocused =
        (event.key === ' ' || event.key === 'Enter') &&
        event.target instanceof HTMLElement &&
        event.target.closest('button, a, [role="button"]');
      if (activatesFocused) return;

      event.preventDefault();
      handler(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
