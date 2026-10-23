import {
  BookOpen,
  ChartColumn,
  Ellipsis,
  FilePenLine,
  Library,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  Sunrise,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Hiện huy hiệu số thẻ cần ôn */
  showDueBadge?: boolean;
  adminOnly?: boolean;
}

export const NAV_TODAY: NavItem = { to: '/', label: 'Hôm nay', icon: Sunrise };
export const NAV_LEARN: NavItem = { to: '/hoc', label: 'Học', icon: BookOpen };
export const NAV_REVIEW: NavItem = {
  to: '/on-tap',
  label: 'Ôn tập',
  icon: RotateCcw,
  showDueBadge: true,
};
export const NAV_QUIZ: NavItem = { to: '/quiz', label: 'Quiz', icon: ListChecks };
export const NAV_EXAMS: NavItem = { to: '/de-thi', label: 'Luyện đề', icon: FilePenLine };
export const NAV_WORDS: NavItem = { to: '/tu-vung', label: 'Từ vựng', icon: Library };
export const NAV_PROGRESS: NavItem = { to: '/tien-do', label: 'Tiến độ', icon: ChartColumn };
export const NAV_PROFILE: NavItem = { to: '/ho-so', label: 'Hồ sơ', icon: UserRound };
export const NAV_ADMIN: NavItem = {
  to: '/quan-tri',
  label: 'Quản trị',
  icon: ShieldCheck,
  adminOnly: true,
};
export const NAV_MORE: NavItem = { to: '/them', label: 'Thêm', icon: Ellipsis };

/** Sidebar desktop: tất cả trang. */
export const SIDEBAR_ITEMS = [
  NAV_TODAY,
  NAV_LEARN,
  NAV_REVIEW,
  NAV_QUIZ,
  NAV_EXAMS,
  NAV_WORDS,
  NAV_PROGRESS,
  NAV_PROFILE,
  NAV_ADMIN,
];

/** Thanh dưới điện thoại: 5 mục. */
export const BOTTOM_ITEMS = [NAV_TODAY, NAV_LEARN, NAV_REVIEW, NAV_QUIZ, NAV_MORE];

/** Trang "Thêm" trên điện thoại. Luyện đề nằm ở đây (SRS 2.0, mục 7.2, điểm cần chốt số 1). */
export const MORE_ITEMS = [NAV_EXAMS, NAV_WORDS, NAV_PROGRESS, NAV_PROFILE, NAV_ADMIN];

/** Đường dẫn được coi là thuộc mục "Thêm" (để đánh dấu đang chọn trên thanh dưới). */
export const MORE_PATHS = ['/them', ...MORE_ITEMS.map((i) => i.to)];
