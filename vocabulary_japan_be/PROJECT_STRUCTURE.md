# Cấu trúc backend

Cột "GĐ" là giai đoạn tạo file (prompt backend, mục 10). ✅ = đã có.

```
.
├── package.json               ✅ 2  Phiên bản cố định; dev/build/start/typecheck/test, db:generate/migrate/deploy/seed/reset,
│                                   create-admin, postinstall (prisma generate)
├── tsconfig.json              ✅ 2  TS strict, NodeNext, import ghi đuôi .ts (tự đổi sang .js khi build); typecheck cả prisma/
├── tsconfig.build.json        ✅ 1  Chỉ build src/ ra dist/
├── vitest.config.ts           ✅ 4  Môi trường node, DB test (5433), globalSetup, chạy lần lượt từng file
├── docker-compose.yml         ✅ 1  PostgreSQL 17: dev cổng 5432 (có volume), test cổng 5433 (tmpfs)
├── .env.example               ✅ 1  Mọi biến môi trường, có chú thích
├── prisma.config.ts           ✅ 2  Cấu hình Prisma 7: schema, migrations, lệnh seed, DATABASE_URL (nạp .env bằng Node)
├── .gitignore                 ✅ 2  + src/generated
├── README.md                     6  Cách chạy, biến môi trường, tài khoản mẫu, kết nối frontend, deploy
├── DEPLOY.md                     6  Hướng dẫn từng bước lên Ubuntu (Nginx, systemd, HTTPS, sao lưu)
├── deploy/                       6  jpvocab-api.service, nginx-jpvocab.conf, deploy.sh, backup.sh
├── prisma/
│   ├── schema.prisma          ✅ 2  Schema theo prompt mục 4; bảng/cột snake_case; timestamptz; 5 index thêm (có lý do)
│   ├── migrations/            ✅ 5  …_init; …_daily_new_words_settings (thêm goal, level)
│   ├── seed.ts                ✅ 2  Chủ đề + từ (qua vocabulary.ts); khi ≠ production: 2 tài khoản mẫu + lịch sử mẫu
│   ├── vocabulary.ts          ✅ 5  Đọc seed-data, thêm chủ đề/từ còn thiếu — dùng chung cho seed và test
│   └── seed-data/             ✅ 2  words.json (416 từ), topics.json (15 chủ đề) chép từ frontend
├── src/
│   ├── app.ts                 ✅ 1  Tạo Express app: helmet, CORS, pino-http, JSON 1 MB, cookie, router /api, 404, error handler
│   ├── server.ts              ✅ 4  listen PORT, dọn phiên hết hạn (lúc khởi động + mỗi 24 giờ), tắt êm (đóng Prisma)
│   ├── scripts/create-admin.ts ✅ 2  npm run create-admin -- --email … --password … [--name …]
│   ├── logger.ts              ✅ 1  pino; ẩn cookie, mật khẩu, token khỏi log
│   ├── config/env.ts          ✅ 1  Đọc .env (process.loadEnvFile), validate bằng zod, sai thì dừng ngay
│   ├── db/prisma.ts           ✅ 2  Một PrismaClient dùng chung (driver adapter @prisma/adapter-pg)
│   ├── generated/prisma/      ✅ 2  Prisma Client sinh tự động (prisma generate), không commit
│   ├── domain/                ✅ 3  Hàm thuần, chép logic từ frontend, ngày tính theo APP_TIMEZONE:
│   │                                dates, srs, normalize (+ buildSearchText), random, streak, quiz,
│   │                                today (chọn từ mới trong ngày), types (hình dạng JSON của hợp đồng)
│   ├── middleware/
│   │   ├── errorHandler.ts    ✅ 1  404 JSON + error handler duy nhất (ApiError, ZodError, body hỏng/quá lớn, 500)
│   │   ├── requireAuth.ts     ✅ 4  Đọc cookie sid, tìm phiên còn hạn, gắn req.user / req.sessionId
│   │   ├── requireAdmin.ts    ✅ 4  Không phải admin → 403
│   │   ├── rateLimit.ts       ✅ 4  auth 10 lần/15 phút/IP, còn lại 300 lần/15 phút → 429 RATE_LIMITED
│   │   └── originCheck.ts     ✅ 4  POST/PUT/PATCH/DELETE phải có Origin (hoặc Referer) khớp CORS_ORIGIN
│   ├── modules/
│   │   ├── health/routes.ts   ✅ 1  GET /api/health
│   │   ├── auth/              ✅ 4  routes.ts, schemas.ts, service.ts, sessions.ts (token 32 byte, DB lưu SHA-256, cookie sid)
│   │   ├── words/             ✅ 5  /words/today (chốt theo ngày, tính lại khi đổi mục tiêu/cấp độ), /words (lọc,
│   │   │                            tìm ILIKE trên search_text, phân trang), /words/:id, /topics, favorite, note
│   │   ├── reviews/              5  /reviews/due, POST /reviews/:wordId
│   │   ├── quiz/                 5  /quiz/start, /quiz/submit
│   │   ├── stats/                5  overview, weekly, calendar (GROUP BY local_date)
│   │   ├── me/                   5  settings, profile, password, DELETE /me
│   │   └── admin/                5  CRUD từ vựng (+ sort/order)
│   ├── serializers/           4–5  user.ts (GĐ4), word.ts (từ + trạng thái người dùng, chủ đề)
│   ├── types/express.d.ts     ✅ 4  Bổ sung req.user, req.sessionId cho Express
│   └── utils/
│       ├── ApiError.ts        ✅ 1  ApiError(status, code, message, fields?) + hàm tạo nhanh
│       ├── zodFields.ts       ✅ 1  Lỗi zod → fields { tên_trường: thông_báo }
│       ├── password.ts        ✅ 2  argon2id hash/verify, chuẩn hóa email, giới hạn 6–128 ký tự
│       └── pagination.ts      ✅ 5  page ≥ 1, page_size 20 (tối đa 100), giá trị sai dùng mặc định
└── tests/
    ├── api/app.test.ts        ✅ 1  health, 404 JSON, body hỏng/quá lớn, CORS, helmet
    ├── api/auth.test.ts       ✅ 4  đăng ký, đăng nhập, me, đăng xuất, phiên hết hạn, phân quyền, Origin, rate limit
    ├── api/words.test.ts      ✅ 5  401, chủ đề, phân trang, lọc, tìm không dấu (+ escape %), yêu thích, ghi chú,
    │                                cách ly A/B, /words/today (chốt ngày, đổi mục tiêu/cấp độ, từ bị xóa)
    ├── api/                      5–6  reviews, quiz, stats, me, admin, kiểm tra hợp đồng
    ├── domain/                ✅ 3  srs, streak, quiz, today (chép từ frontend) + dates, streak quanh nửa đêm giờ VN, normalize
    └── helpers/               ✅ 4  fixtures (makeWord), globalSetup (chặn DB không phải test + migrate), db (reset),
                                     api (agent có Origin + cookie, đăng ký nhanh), testDbUrl
```
