import { Outlet, useLocation, useNavigation } from 'react-router-dom';
import { Brand } from './Brand';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

/**
 * Khung trang sau khi đăng nhập: sidebar (≥ 768px) hoặc thanh dưới (điện thoại).
 * Nội dung rộng tối đa 720px; mỗi lần đổi trang thì mờ dần nhẹ (tắt khi giảm chuyển động).
 */
export function AppLayout() {
  const location = useLocation();
  const navigation = useNavigation();
  const loadingPage = navigation.state === 'loading';

  return (
    <div className="min-h-dvh md:flex">
      <a
        href="#noi-dung"
        className="sr-only z-50 bg-son px-4 py-2 text-on-son focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Bỏ qua tới nội dung chính
      </a>

      {/* Nét son mảnh ở đầu trang trong lúc tải mã của trang kế tiếp (lazy load). */}
      <div
        aria-hidden="true"
        className={`fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-son transition-transform duration-500 ${
          loadingPage ? 'scale-x-75' : 'scale-x-0'
        }`}
      />

      <Sidebar className="hidden md:flex" />

      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center border-b border-rule px-4 md:hidden">
          <Brand />
        </header>
        <main
          id="noi-dung"
          tabIndex={-1}
          className="pb-[calc(5rem+env(safe-area-inset-bottom))] outline-none md:pb-12"
        >
          <div
            key={location.pathname}
            className="mx-auto max-w-[720px] animate-page-in px-4 pt-6 md:px-8 md:pt-10"
          >
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav className="md:hidden" />
    </div>
  );
}
