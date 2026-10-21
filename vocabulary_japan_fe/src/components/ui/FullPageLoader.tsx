/**
 * Màn hình chờ toàn trang (khi đang kiểm tra phiên đăng nhập): một ô genkō trống với
 * một nét son đang được tô. Khi giảm chuyển động, nét son đứng yên.
 */
export function FullPageLoader({ label = 'Đang mở sổ…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh flex-col items-center justify-center gap-4"
    >
      <div aria-hidden="true" className="genko-cell size-16 rounded-[4px]">
        <span className="absolute left-3 right-3 top-1/2 h-1.5 -translate-y-1/2 origin-left animate-brush rounded-full bg-son" />
      </div>
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}
