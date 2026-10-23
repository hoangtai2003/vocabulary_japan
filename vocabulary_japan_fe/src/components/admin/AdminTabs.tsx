import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/cn';

const TABS = [
  { to: '/quan-tri', label: 'Kho từ vựng', end: true },
  { to: '/quan-tri/de-thi', label: 'Đề thi', end: false },
];

/** Hai khu vực của trang Quản trị: kho từ vựng và đề thi (SRS 2.0). */
export function AdminTabs() {
  return (
    <nav aria-label="Khu vực quản trị" className="-mt-2 mb-5 flex gap-1 border-b border-rule">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'relative px-3 py-2 text-sm font-semibold',
              isActive ? 'text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-son' : 'text-ink-muted hover:text-ink',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
