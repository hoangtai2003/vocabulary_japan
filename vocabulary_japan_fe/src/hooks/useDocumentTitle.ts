import { useEffect } from 'react';

const APP_NAME = 'Sổ luyện chữ';

/** Đặt tiêu đề tab theo trang, giúp người dùng trình đọc màn hình biết đang ở đâu. */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
