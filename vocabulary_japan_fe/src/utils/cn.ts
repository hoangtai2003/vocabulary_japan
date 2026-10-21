/** Nối className, bỏ qua giá trị rỗng/false. */
export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}
