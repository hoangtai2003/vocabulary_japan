/** Logo: con dấu son tròn chữ 字 và tên app. */
export function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-full bg-son font-brush text-lg font-semibold text-on-son ring-2 ring-son ring-offset-2 ring-offset-paper"
      >
        字
      </span>
      <span className="font-display text-lg font-semibold leading-tight">Sổ luyện chữ</span>
    </span>
  );
}
