# Cấu trúc dự án

Cột "GĐ" là giai đoạn tạo file (mục 11 của prompt). ✅ = đã có. "2.0" = module luyện đề JLPT (SRS 2.0).

```
.
├── index.html                 ✅ 1  HTML gốc, script áp .dark trước khi React render, tải Google Fonts (GĐ3)
├── package.json               ✅ 1  Phiên bản cố định, script dev/build/preview/test/typecheck
├── vite.config.ts             ✅ 1  Vite + React + Tailwind v4, alias @ → src, cấu hình Vitest (jsdom)
├── tsconfig.json              ✅ 1  Gốc, tham chiếu app + node
├── tsconfig.app.json          ✅ 1  TS strict cho src/
├── tsconfig.node.json         ✅ 1  TS cho file cấu hình
├── .gitignore                 ✅ 1
├── .env.example               ✅ 1  VITE_API_URL
├── API_CONTRACT.md            ✅ 2  Bản sao mục 4 + phụ lục chi tiết đã chốt, đầu vào cho backend; 2.0: nhóm endpoint
│                                  luyện đề, quản trị đề, mã lỗi mới, phụ lục J (kiểu dữ liệu, luật)
├── DESIGN.md                ✅ 3  Plan thiết kế: token, font, wireframe, tự phê bình
├── README.md                  ✅ 5  Cách chạy cùng backend, biến môi trường,
│                                lệnh build và thư mục đầu ra dist/ (deploy theo ../DEPLOY.md)
├── public/
│   └── favicon.svg            ✅ 2  Con dấu son 字
└── src/
    ├── main.tsx               ✅ 2  Điểm vào, render App
    ├── App.tsx                ✅ 2  QueryClientProvider + AuthProvider; GĐ3 thêm RouterProvider
    ├── index.css              ✅ 1  Tailwind, biến thể dark; GĐ3 thêm token màu và font
    ├── vite-env.d.ts          ✅ 1  Kiểu cho import.meta.env
    ├── router.tsx (+ test)    ✅ 3  routes + createBrowserRouter, lazy load từng trang, future flag v7
    ├── api/
    │   ├── env.ts             ✅ 2  Đọc VITE_API_URL
    │   ├── client.ts          ✅ 2  fetch wrapper: /api, credentials, timeout 15s, ApiError, xử lý 401
    │   ├── queryClient.ts     ✅ 2  QueryClient mặc định (không retry lỗi 4xx)
    │   ├── queryKeys.ts       ✅ 2  Query key tập trung
    │   ├── authApi.ts         ✅ 2  register, login, logout, me
    │   ├── wordsApi.ts        ✅ 2  today, list, detail, topics, favorite, note
    │   ├── reviewApi.ts       ✅ 2  due, grade
    │   ├── quizApi.ts         ✅ 2  start, submit
    │   ├── statsApi.ts        ✅ 2  overview, weekly, calendar
    │   ├── meApi.ts           ✅ 2  settings, profile, password, export, delete
    │   ├── adminApi.ts        ✅ 2  CRUD từ, import, export (có sort/order)
    │   ├── examsApi.ts        ✅ 2.0 Đề, lượt làm, đáp án, nộp, kết quả, luyện tập, thống kê, uploadUrl
    │   └── examAdminApi.ts    ✅ 2.0 Quản trị đề: cây đề, từng tầng, trạng thái, sắp xếp, nhập/xuất, ảnh, dạng mondai
    ├── components/
    │   ├── ui/                ✅ 3  Button, buttonStyles, Input, field, PasswordInput, Select, Textarea, Modal (+ test),
    │   │                            Toast, Skeleton, EmptyState, ErrorState, ProgressBar (hàng ô), GenkoMark, Seal, Card,
    │   │                            Spinner, FullPageLoader, OptionGroup (GĐ4) — không biết gì về API
    │   ├── study/             ✅ 4  FlashCard (+ test), StudySession, GradeButtons, SessionSummary, StudySkeleton
    │   ├── quiz/              ✅ 4  QuizSetup, QuizQuestion (+ test), QuizResult, QuizSkeleton
    │   ├── words/             ✅ 4  WordCard, WordDetail (panel + nội dung), WordFilters, NoteEditor,
    │   │                            FavoriteButton, StatusLabel, WordsSkeleton
    │   ├── progress/          ✅ 4  StatGrid, WeeklyChart (Recharts + bảng), StudyHeatmap (lưới CSS),
    │   │                            ChartCard, chartColors (màu đã kiểm bằng validator dataviz); ExamStatsSection (2.0)
    │   ├── today/             ✅ 4  DailyProgress, DueCard, TodayWordList, TodaySkeleton
    │   ├── profile/           ✅ 4  ProfileSection, DisplayNameForm, StudySettingsForm (lưu ngay + toast),
    │   │                            PasswordForm, DataSection (xóa tài khoản), DeleteAccountModal (mật khẩu + gõ XÓA)
    │   ├── admin/             ✅ 4  AdminWordTable (sắp xếp theo cột, aria-sort), Pagination, AdminTableSkeleton,
    │   │                            WordFormModal (wordFormSchema), DeleteWordModal (xuất/nhập file: tạm hoãn); AdminTabs (2.0)
    │   ├── exam/              ✅ 2.0 Markup (furigana, gạch chân, chỗ trống, bảng, ảnh), QuestionView (câu ★), PassageView,
    │   │                            ExplanationView (6 mục, thêm vào ôn tập), ScoreCard, AnswerGrid; run/: RunTopBar (đồng hồ,
    │   │                            trạng thái lưu), QuestionNavPanel, SectionIntro
    │   ├── examAdmin/         ✅ 2.0 ExamOutline (kéo thả, lên/xuống, lọc câu gắn cờ), EntityForms, QuestionForm,
    │   │                            ExplanationEditor, MarkupField (thanh công cụ, xem trước, lỗi cú pháp), IssuesPanel,
    │   │                            ExamPreview (điện thoại/máy tính, làm bài/lời giải), StatusBadge, editorCache, validation
    │   ├── auth/              ✅ 3  AuthGate, ProtectedRoute, GuestRoute (chuyển về ?next=), AdminRoute,
    │   │                            ThemeSync, AuthLayout, FormAlert
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
    │   ├── useExamRunner.ts   ✅ 2.0 Màn hình làm bài: phạm vi câu, đáp án cục bộ, hàng đợi lưu, thời gian từng câu
    │   ├── useCountdown.ts    ✅ 2.0 Đồng hồ theo hạn nộp của server (bù độ lệch giờ máy)
    │   ├── useAutosave.ts     ✅ 2.0 Tự lưu form của trình soạn đề, chỉ gửi trường đã đổi
    │   └── useWordFilters.ts  ✅ 4  Bộ lọc trang Từ vựng trên URL (?q=&level=&topic=&status=&fav=1&tu=)
    ├── pages/             ✅ 3–4  Một file mỗi route. Xong: Forbidden, NotFound, More, Login, Register,
    │                                Today, Learn, Review, Quiz, Words, Progress, Profile, Admin
    │                                (đều có test); 2.0: ExamList, ExamDetail, ExamRun (toàn màn hình), ExamResult,
    │                                WrongQuestions, AdminExams, AdminExamImport, AdminExamEditor, AdminExamPreview
    ├── stores/
    │   ├── themeStore.ts      ✅ 3  light/dark/system, đồng bộ localStorage và class .dark
    │   ├── toastStore.ts      ✅ 3
    │   ├── sessionStore.ts (+ test) ✅ 4  Hàng đợi phiên học, thẻ quay lại, đã lật, furigana
    │   └── editorStatusStore.ts ✅ 2.0 Trạng thái tự lưu của trình soạn đề (Đã lưu / Đang lưu / Chưa lưu)
    ├── schemas/
    │   ├── word.ts            ✅ 2  Schema Word không có id (API giả lập trong test) + wordFormSchema (form Quản trị,
    │   │                            nghĩa mỗi dòng một), kiểm tra khớp kiểu
    │   ├── auth.ts            ✅ 2  Đăng nhập, đăng ký (form + request)
    │   ├── account.ts         ✅ 2  Cài đặt, hồ sơ, đổi mật khẩu, ghi chú, xóa tài khoản
    │   └── fieldErrors.ts     ✅ 2  Lỗi zod → fields của API
    ├── types/
    │   ├── word.ts            ✅ 2  JlptLevel, WordType, WordStatus, Topic, Word, UserWordState, WordWithState, nhãn
    │   ├── user.ts            ✅ 2  User, UserSettings
    │   ├── api.ts             ✅ 2  Paginated, lỗi API, QuizQuestion, QuizResult, kiểu request/response
    │   ├── exam.ts            ✅ 2.0 Kiểu của module luyện đề (API_CONTRACT.md phụ lục J)
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
    │   ├── safeNext.ts (+ test) ✅ 3  Chỉ chấp nhận ?next= nội bộ
    │   ├── markup.ts, exam.ts (+ test) ✅ 2.0 Chép từ backend: cú pháp đánh dấu, luật đề, điểm ước tính
    │   ├── answerQueue.ts (+ test) ✅ 2.0 Câu trả lời chờ gửi trong localStorage (mất mạng, đóng trình duyệt)
    │   ├── examOrder.ts (+ test) ✅ 2.0 Thứ tự cây đề sau kéo thả
    │   ├── examFormat.ts (+ test) ✅ 2.0 Nhãn chế độ, trạng thái, ngày giờ, thời lượng
    │   └── download.ts        ✅ 2.0 Lưu file tải về (xuất đề, file mẫu)
    └── test/
        ├── setup.ts           ✅ 2  jest-dom, vòng đời MSW node, xóa localStorage sau mỗi test
        ├── fixtures.ts        ✅ 2  makeWord cho test
        ├── logout.test.tsx    ✅ 6  Đăng xuất về /dang-nhap không kèm next; đăng nhập lại vào Hôm nay
        ├── renderApp.tsx      ✅ 3  Render cả app (router thật + MSW node + Toaster) cho test
        ├── examFixtures.ts    ✅ 2.0 Lượt làm, kết quả mẫu (cắt từ đề số 11) cho test trang đề thi
        └── mock/              API giả lập chỉ dùng trong test (app chạy thật luôn gọi backend)
            ├── server.ts          setupServer (MSW node)
            ├── db.ts              Đọc/ghi localStorage (jpvocab:mock-db, jpvocab:mock-session)
            ├── seed.ts            Tài khoản mẫu, mô phỏng 30 ngày học bằng chính hàm SRS
            ├── crypto.ts          SHA-256 bằng Web Crypto, tạo id
            ├── types.ts           Kiểu của dữ liệu giả lập
            ├── handlers.test.ts   Test tích hợp: module API → client → MSW node
            ├── handlers/          http (lỗi chuẩn), shared, auth, words, reviews, quiz, stats, me, admin, exams (2.0:
            │                      mặc định chưa có đề; test thêm dữ liệu bằng server.use), index
            └── data/              Bản sao seed-data của backend: words.json, topics.json, words.test.ts
```
