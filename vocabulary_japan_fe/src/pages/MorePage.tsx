import { ChevronRight, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { MORE_ITEMS } from '@/components/layout/navItems';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLogout } from '@/hooks/useLogout';

/** Mục "Thêm" trên điện thoại: các trang không có chỗ trên thanh dưới, và Đăng xuất. */
export default function MorePage() {
  useDocumentTitle('Thêm');
  const { user } = useAuth();
  const logout = useLogout();
  const items = MORE_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin');
  const rowClass =
    'flex h-14 w-full items-center gap-4 px-1 text-left text-base hover:bg-ink/5 rounded-[var(--radius-control)]';

  return (
    <>
      <PageHeader
        title="Thêm"
        description={user ? `Đang đăng nhập: ${user.display_name}` : undefined}
      />
      <ul className="border-t border-rule">
        {items.map((item) => (
          <li key={item.to} className="border-b border-rule">
            <Link to={item.to} className={rowClass}>
              <item.icon aria-hidden="true" className="size-5 text-ink-muted" />
              <span className="flex-1">{item.label}</span>
              <ChevronRight aria-hidden="true" className="size-5 text-ink-muted" />
            </Link>
          </li>
        ))}
        <li className="border-b border-rule">
          <button
            type="button"
            onClick={() => void logout()}
            className={`${rowClass} text-son-ink`}
          >
            <LogOut aria-hidden="true" className="size-5" />
            <span className="flex-1">Đăng xuất</span>
          </button>
        </li>
      </ul>
    </>
  );
}
