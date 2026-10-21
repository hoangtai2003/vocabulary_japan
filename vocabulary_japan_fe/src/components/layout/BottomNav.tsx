import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { DueBadge } from './DueBadge';
import { BOTTOM_ITEMS, MORE_PATHS, NAV_MORE } from './navItems';

/** Thanh điều hướng dưới cho điện thoại: 5 mục, mục đang chọn có gạch son phía trên. */
export function BottomNav({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const inMore = MORE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <nav
      aria-label="Điều hướng chính"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {BOTTOM_ITEMS.map((item) => (
          <li key={item.to} className="flex">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => {
                const active = item === NAV_MORE ? inMore : isActive;
                return cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-1 text-xs',
                  active ? 'font-semibold text-ink' : 'text-ink-muted',
                );
              }}
            >
              {({ isActive }) => {
                const active = item === NAV_MORE ? inMore : isActive;
                return (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute inset-x-5 top-0 h-0.5',
                        active ? 'bg-son' : 'bg-transparent',
                      )}
                    />
                    <span className="relative">
                      <item.icon aria-hidden="true" className="size-5" />
                      {item.showDueBadge && <DueBadge className="absolute -right-3 -top-1.5" />}
                    </span>
                    <span>{item.label}</span>
                  </>
                );
              }}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
