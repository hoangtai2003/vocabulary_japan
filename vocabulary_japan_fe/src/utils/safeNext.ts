/**
 * Chỉ chấp nhận đường dẫn nội bộ bắt đầu bằng "/" cho tham số ?next=, để không bị lợi dụng
 * chuyển hướng sang trang ngoài ("//evil.com", "/\\evil.com", "https://...").
 */
export function safeNext(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\'))
    return fallback;
  return value;
}

/** Đường dẫn trang đăng nhập kèm next là trang hiện tại. */
export function loginPathWithNext(pathname: string, search = ''): string {
  const next = pathname + search;
  return next === '/' ? '/dang-nhap' : `/dang-nhap?next=${encodeURIComponent(next)}`;
}
