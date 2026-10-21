/** Lỗi chung ở đầu form (ví dụ sai email hoặc mật khẩu). */
export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mb-4 border border-son/40 border-l-[3px] border-l-son bg-son-wash/60 px-3 py-2.5 text-sm font-medium text-ink"
    >
      {message}
    </p>
  );
}
