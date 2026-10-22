# Cấu trúc dự án

Cột "GĐ" là giai đoạn tạo file (mục 11 của prompt). ✅ = đã có.

```
.
├── index.html                 ✅ 1  HTML gốc, script áp .dark trước khi React render, tải Google Fonts (GĐ3)
├── package.json               ✅ 1  Phiên bản cố định, script dev/build/preview/test/typecheck
├── vite.config.ts             ✅ 1  Vite + React + Tailwind v4, alias @ → src, cấu hình Vitest (jsdom)
├── tsconfig.json              ✅ 1  Gốc, tham chiếu app + node
├── tsconfig.app.json          ✅ 1  TS strict cho src/
├── tsconfig.node.json         ✅ 1  TS cho file cấu hình
├── .gitignore                 ✅ 1
├── .env.example               ✅ 1  VITE_API_MODE, VITE_API_URL
├── API_CONTRACT.md            ✅ 2  Bản sao mục 4 + phụ lục chi tiết đã chốt, đầu vào cho backend
├── DESIGN.md                ✅ 3  Plan thiết kế: token, font, wireframe, tự phê bình
├── README.md                  ✅ 5  Cách chạy, tài khoản mẫu, chuyển API thật, reset mock, biến môi trường,
│                                lệnh build và thư mục đầu ra dist/ (deploy theo ../DEPLOY.md)
├── public/
│   ├── mockServiceWorker.js   ✅ 1  Worker MSW (sinh bằng `msw init`)
│   └── favicon.svg            ✅ 2  Con dấu son 字
└── src/
    ├── main.tsx               ✅ 2  Điểm vào, khởi động MSW khi VITE_API_MODE=mock rồi mới render
    ├── App.tsx                ✅ 2  QueryClientProvider + AuthProvider; GĐ3 thêm RouterProvider
    ├── index.css              ✅ 1  Tailwind, biến thể dark; GĐ3 thêm token màu và font
    ├── vite-env.d.ts          ✅ 1  Kiểu cho import.meta.env
    ├── router.tsx (+ test)    ✅ 3  routes + createBrowserRouter, lazy load từng trang, future flag v7
    ├── api/
    │   ├── env.ts             ✅ 2  Đọc VITE_API_MODE / VITE_API_URL
    │   ├── client.ts          ✅ 2  fetch wrapper: /api, credentials, timeout 15s, ApiError, xử lý 401
    │   ├── queryClient.ts     ✅ 2  QueryClient mặc định (không retry lỗi 4xx)
    │   ├── queryKeys.ts       ✅ 2  Query key tập trung
    │   ├── authApi.ts         ✅ 2  register, login, logout, me
    │   ├── wordsApi.ts        ✅ 2  today, list, detail, topics, favorite, note
    │   ├── reviewApi.ts       ✅ 2  due, grade
    │   ├── quizApi.ts         ✅ 2  start, submit
    │   ├── statsApi.ts        ✅ 2  overview, weekly, calendar
    │   ├── meApi.ts           ✅ 2  settings, profile, password, export, delete
    │   └── adminApi.ts        ✅ 2  CRUD từ, import, export (có sort/order)
    ├── components/
    │   ├── ui/                ✅ 3  Button, buttonStyles, Input, field, PasswordInput, Select, Textarea, Modal (+ test),
    │   │                            Toast, Skeleton, EmptyState, ErrorState, ProgressBar (hàng ô), GenkoMark, Seal, Card,
    │   │                            Spinner, FullPageLoader, OptionGroup (GĐ4) — không biết gì về API
    │   ├── study/             ✅ 4  FlashCard (+ test), StudySession, GradeButtons, SessionSummary, StudySkeleton
    │   ├── quiz/              ✅ 4  QuizSetup, QuizQuestion (+ test), QuizResult, QuizSkeleton
    │   ├── words/             ✅ 4  WordCard, WordDetail (panel + nội dung), WordFilters, NoteEditor,
    │   │                            FavoriteButton, StatusLabel, WordsSkeleton
    │   ├── progress/          ✅ 4  StatGrid, WeeklyChart (Recharts + bảng), StudyHeatmap (lưới CSS),
    │   │                            ChartCard, chartColors (màu đã kiểm bằng validator dataviz)
    │   ├── today/             ✅ 4  DailyProgress, DueCard, TodayWordList, TodaySkeleton
    │   ├── profile/           ✅ 4  ProfileSection, DisplayNameForm, StudySettingsForm (lưu ngay + toast),
    │   │                            PasswordForm, DataSection (xóa tài khoản), DeleteAccountModal (mật khẩu + gõ XÓA),
    │   │                            MockTools (nút ẩn đặt lại dữ liệu mock)
    │   ├── admin/             ✅ 4  AdminWordTable (sắp xếp theo cột, aria-sort), Pagination, AdminTableSkeleton,
    │   │                            WordFormModal (wordFormSchema), DeleteWordModal (xuất/nhập file: tạm hoãn)
    │   ├── auth/              ✅ 3  AuthGate, ProtectedRoute, GuestRoute (chuyển về ?next=), AdminRoute,
    │   │                            ThemeSync, AuthLayout, FormAlert, SampleAccounts
    │   └── layout/            ✅ 3  AppLayout, Sidebar, BottomNav, navItems, DueBadge, Brand, PageHeader, RouteError
    ├── context/
    │   ├── authContext.ts     ✅ 2  Kiểu và React context của phiên đăng nhập
    │   └── AuthProvider.tsx   ✅ 2  Gọi /auth/me một lần, login/register/logout, xử lý 401
    ├── hooks/
    │   ├── useAuth.ts         ✅ 2  Đọc AuthContext
    │   ├── queries/           ✅ 2  useToday, useWords (vô hạn), useWord, useTopics, useWordMutations (optimistic),
    │   │                            useReviews (due, grade), useQuiz, useStats, useAccount, useAdminWords, wordCache
    │   ├── useHotkeys.ts      ✅ 3  Phím tắt toàn trang, bỏ qua khi đang gõ/có modal
    │   ├── useDebounce.ts     ✅ 3
    │   ├── useDocumentTitle.ts ✅ 3  Tiêu đề tab theo trang
    │   ├── useMediaQuery.ts   ✅ 3
    │   ├── useLogout.ts       ✅ 3  Đăng xuất rồi về /dang-nhap
    │   ├── useLeaveGuard.ts   ✅ 4  Hỏi xác nhận khi rời trang (useBlocker + beforeunload)
    │   └── useWordFilters.ts  ✅ 4  Bộ lọc trang Từ vựng trên URL (?q=&level=&topic=&status=&fav=1&tu=)
    ├── mock/
    │   ├── browser.ts         ✅ 2  setupWorker
    │   ├── server.ts          ✅ 2  setupServer cho test (MSW node)
    │   ├── db.ts              ✅ 2  Đọc/ghi localStorage (jpvocab:mock-db, jpvocab:mock-session), reset
    │   ├── seed.ts            ✅ 2  Tài khoản mẫu, mô phỏng 30 ngày học bằng chính hàm SRS
    │   ├── sampleAccounts.ts  ✅ 3  2 tài khoản mẫu (file nhẹ cho trang đăng nhập)
    │   ├── crypto.ts          ✅ 2  SHA-256 bằng Web Crypto, tạo id
    │   ├── types.ts           ✅ 2  Kiểu của dữ liệu mock
    │   ├── handlers.test.ts   ✅ 2  Test tích hợp: module API → client → MSW node
    │   ├── handlers/          ✅ 2  http (độ trễ, ?mockError=1, lỗi chuẩn), shared, auth, words, reviews,
    │   │                            quiz, stats, me, admin, index
    │   └── data/              ✅ 2  words.json (99 N5, 317 N4), topics.json (15 chủ đề), words.test.ts
    ├── pages/             ✅ 3–4  Một file mỗi route. Xong: Forbidden, NotFound, More, Login, Register,
    │                                Today, Learn, Review, Quiz, Words, Progress, Profile, Admin
    │                                (đều có test)
    ├── stores/
    │   ├── themeStore.ts      ✅ 3  light/dark/system, đồng bộ localStorage và class .dark
    │   ├── toastStore.ts      ✅ 3
    │   └── sessionStore.ts (+ test) ✅ 4  Hàng đợi phiên học, thẻ quay lại, đã lật, furigana
    ├── schemas/
    │   ├── word.ts            ✅ 2  Schema Word không có id (mock, import) + wordFormSchema (form Quản trị,
    │   │                            nghĩa mỗi dòng một), kiểm tra khớp kiểu
    │   ├── auth.ts            ✅ 2  Đăng nhập, đăng ký (form + request)
    │   ├── account.ts         ✅ 2  Cài đặt, hồ sơ, đổi mật khẩu, ghi chú, xóa tài khoản
    │   └── fieldErrors.ts     ✅ 2  Lỗi zod → fields của API
    ├── types/
    │   ├── word.ts            ✅ 2  JlptLevel, WordType, WordStatus, Topic, Word, UserWordState, WordWithState, nhãn
    │   ├── user.ts            ✅ 2  User, UserSettings
    │   ├── api.ts             ✅ 2  Paginated, lỗi API, QuizQuestion, QuizResult, kiểu request/response
    │   └── index.ts           ✅ 2
    ├── utils/
    │   ├── srs.ts (+ test)    ✅ 2  SM-2 rút gọn, nhận now: Date
    │   ├── grades.ts          ✅ 2  4 nút chấm điểm, phím tắt → quality
    │   ├── dates.ts           ✅ 2  Đầu/cuối ngày, YYYY-MM-DD, đầu tuần, theo giờ địa phương
    │   ├── streak.ts (+ test) ✅ 2  Streak hiện tại và dài nhất
    │   ├── quiz.ts (+ test)   ✅ 2  Chọn từ, tạo đáp án nhiễu, chấm điểm
    │   ├── today.ts (+ test)  ✅ 2  Chọn từ mới trong ngày
    │   ├── normalize.ts (+ test) ✅ 2  Bỏ dấu tiếng Việt khi tìm kiếm
    │   ├── random.ts          ✅ 2  PRNG có seed, xáo trộn
    │   ├── cn.ts              ✅ 3  Nối className
    │   ├── format.ts (+ test) ✅ 4  Định dạng ngày tiếng Việt, ngày ôn tiếp theo
    │   ├── heatmap.ts (+ test) ✅ 4  Lưới heatmap 27 tuần × 7 ngày, chia mức theo số lượt
    │   ├── formErrors.ts      ✅ 4  Gắn lỗi API (fields) vào react-hook-form
    │   └── safeNext.ts (+ test) ✅ 3  Chỉ chấp nhận ?next= nội bộ
    └── test/
        ├── setup.ts           ✅ 2  jest-dom, vòng đời MSW node, xóa localStorage sau mỗi test
        ├── fixtures.ts        ✅ 2  makeWord cho test
        ├── logout.test.tsx    ✅ 6  Đăng xuất về /dang-nhap không kèm next; đăng nhập lại vào Hôm nay
        └── renderApp.tsx      ✅ 3  Render cả app (router thật + MSW node + Toaster) cho test
```
