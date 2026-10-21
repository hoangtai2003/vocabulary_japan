import { Link } from 'react-router-dom';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { GenkoMark } from '@/components/ui/GenkoMark';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** 404 cho mọi đường dẫn không tồn tại. */
export default function NotFoundPage() {
  useDocumentTitle('Không tìm thấy trang');
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <GenkoMark char="無" />
      <div>
        <h1 className="text-2xl">Không có trang này</h1>
        <p className="mt-2 text-ink-muted">
          Đường dẫn có thể đã cũ hoặc gõ nhầm. Quay về trang Hôm nay để học tiếp.
        </p>
      </div>
      <Link to="/" className={buttonClasses()}>
        Về Hôm nay
      </Link>
    </main>
  );
}
