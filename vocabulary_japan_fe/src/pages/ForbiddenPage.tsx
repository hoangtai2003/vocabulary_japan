import { Link } from 'react-router-dom';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { GenkoMark } from '@/components/ui/GenkoMark';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** 403: hiển thị trong layout khi người không phải admin mở trang Quản trị. */
export default function ForbiddenPage() {
  useDocumentTitle('Không có quyền truy cập');
  return (
    <div className="flex flex-col items-center gap-5 py-12 text-center">
      <GenkoMark char="禁" />
      <div className="max-w-sm">
        <h1 className="text-2xl">Trang này dành cho quản trị viên</h1>
        <p className="mt-2 text-ink-muted">
          Tài khoản của bạn không có quyền quản trị. Bạn có thể quay lại học tiếp.
        </p>
      </div>
      <Link to="/" className={buttonClasses()}>
        Về Hôm nay
      </Link>
    </div>
  );
}
