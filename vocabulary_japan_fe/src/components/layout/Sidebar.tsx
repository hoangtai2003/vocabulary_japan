import { LogOut } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLogout } from '@/hooks/useLogout';
import { cn } from '@/utils/cn';
import { Brand } from './Brand';
import { DueBadge } from './DueBadge';
import { SIDEBAR_ITEMS } from './navItems';

/**
 * Sidebar desktop. Mục đang mở không tô nền "pill": có ô vuông son nhỏ bên trái và chữ đậm,
 * như một dấu đánh trong vở. Ngăn với nội dung bằng đường kẻ đôi như lề vở.
 */
export function Sidebar({ className }: { className?: string }) {
  const { user } = useAuth();
  const logout = useLogout();
  const items = SIDEBAR_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin');

  return (
    <aside
      className={cn(
        'sticky top-0 h-dvh w-60 shrink-0 flex-col border-r-4 border-double border-rule bg-paper px-4 py-6',
        className,
      )}
    >
      <Link
        to="/"
        className="mb-8 rounded-[var(--radius-control)] px-2"
        aria-label="Sổ luyện chữ, về Hôm nay"
      >
        <Brand />
      </Link>

      <nav aria-label="Điều hướng chính" className="flex-1">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'group flex h-10 items-center gap-3 rounded-[var(--radius-control)] px-2 text-[15px] transition-colors',
                    isActive ? 'font-semibold text-ink' : 'text-ink-muted hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-2 shrink-0',
                        isActive ? 'bg-son' : 'bg-transparent group-hover:bg-rule',
                      )}
                    />
                    <item.icon aria-hidden="true" className="size-[18px] shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.showDueBadge && <DueBadge />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-rule pt-4">
        <p className="truncate px-2 text-sm font-medium">{user?.display_name}</p>
        <p className="truncate px-2 text-xs text-ink-muted">{user?.email}</p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-2 flex h-10 w-full items-center gap-3 rounded-[var(--radius-control)] px-2 text-[15px] text-ink-muted hover:text-ink"
        >
          <span aria-hidden="true" className="size-2" />
          <LogOut aria-hidden="true" className="size-[18px]" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
