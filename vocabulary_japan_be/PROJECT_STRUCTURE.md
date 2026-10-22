# Cấu trúc backend

Cột "GĐ" là giai đoạn tạo file (prompt backend, mục 10). ✅ = đã có.

```
.
├── package.json               ✅ 1  Phiên bản cố định; script dev/build/start/typecheck/test (db:*, create-admin thêm ở GĐ 2, 5)
├── tsconfig.json              ✅ 1  TS strict, NodeNext, import ghi đuôi .ts (tự đổi sang .js khi build)
├── tsconfig.build.json        ✅ 1  Chỉ build src/ ra dist/
├── vitest.config.ts           ✅ 1  Môi trường node, biến env cho test
├── docker-compose.yml         ✅ 1  PostgreSQL 17: dev cổng 5432 (có volume), test cổng 5433 (tmpfs)
├── .env.example               ✅ 1  Mọi biến môi trường, có chú thích
├── .gitignore                 ✅ 1
├── README.md                     6  Cách chạy, biến môi trường, tài khoản mẫu, kết nối frontend, deploy
├── DEPLOY.md                     6  Hướng dẫn từng bước lên Ubuntu (Nginx, systemd, HTTPS, sao lưu)
├── deploy/                       6  jpvocab-api.service, nginx-jpvocab.conf, deploy.sh, backup.sh
├── prisma/
│   ├── schema.prisma             2  Schema theo prompt mục 4 (@@map snake_case)
│   ├── migrations/               2  prisma migrate
│   ├── seed.ts                   2  Upsert chủ đề + từ; tài khoản và lịch sử mẫu khi NODE_ENV ≠ production
│   └── seed-data/                2  words.json, topics.json chép từ frontend (src/mock/data/)
├── src/
│   ├── app.ts                 ✅ 1  Tạo Express app: helmet, CORS, pino-http, JSON 1 MB, cookie, router /api, 404, error handler
│   ├── server.ts              ✅ 1  listen PORT, tắt êm khi SIGINT/SIGTERM
│   ├── logger.ts              ✅ 1  pino; ẩn cookie, mật khẩu, token khỏi log
│   ├── config/env.ts          ✅ 1  Đọc .env (process.loadEnvFile), validate bằng zod, sai thì dừng ngay
│   ├── db/prisma.ts              2  Một PrismaClient dùng chung
│   ├── domain/                   3  srs, streak, quiz, dates (theo APP_TIMEZONE), normalize — hàm thuần chép từ frontend
│   ├── middleware/
│   │   ├── errorHandler.ts    ✅ 1  404 JSON + error handler duy nhất (ApiError, ZodError, body hỏng/quá lớn, 500)
│   │   ├── requireAuth.ts        4  Đọc cookie sid, tìm session còn hạn, gắn req.user
│   │   ├── requireAdmin.ts       4
│   │   ├── rateLimit.ts          4  auth 10 lần/15 phút/IP, còn lại 300 lần/15 phút
│   │   └── originCheck.ts        4  POST/PUT/DELETE phải có Origin khớp CORS_ORIGIN
│   ├── modules/
│   │   ├── health/routes.ts   ✅ 1  GET /api/health
│   │   ├── auth/                 4  routes.ts, schemas.ts, service.ts
│   │   ├── words/                5  /words/today, /words, /words/:id, /topics, favorite, note
│   │   ├── reviews/              5  /reviews/due, POST /reviews/:wordId
│   │   ├── quiz/                 5  /quiz/start, /quiz/submit
│   │   ├── stats/                5  overview, weekly, calendar (GROUP BY local_date)
│   │   ├── me/                   5  settings, profile, password, DELETE /me
│   │   └── admin/                5  CRUD từ vựng (+ sort/order)
│   ├── serializers/              5  Model Prisma (camelCase) → JSON hợp đồng (snake_case)
│   └── utils/
│       ├── ApiError.ts        ✅ 1  ApiError(status, code, message, fields?) + hàm tạo nhanh
│       ├── zodFields.ts       ✅ 1  Lỗi zod → fields { tên_trường: thông_báo }
│       └── pagination.ts         5
└── tests/
    ├── api/app.test.ts        ✅ 1  health, 404 JSON, body hỏng/quá lớn, CORS, helmet
    ├── api/                      4–6 auth, phân quyền, cách ly dữ liệu, today, reviews, quiz, hợp đồng
    ├── domain/                   3  Test chép từ frontend + múi giờ quanh nửa đêm
    └── helpers/                  4  Tạo app + DB test, reset giữa các test, đăng nhập nhanh
```
