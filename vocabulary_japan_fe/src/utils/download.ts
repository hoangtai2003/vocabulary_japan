/** Cho trình duyệt tải một Blob về máy với tên file cho trước. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Đợi trình duyệt bắt đầu tải rồi mới thu hồi URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(data: unknown, filename: string): void {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
}
