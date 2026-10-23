# Sổ luyện chữ — Backend

REST API cho app học từ vựng tiếng Nhật (JLPT N5–N4). Node.js 24 + Express 5 + TypeScript + PostgreSQL (Prisma 7).

Hợp đồng API (nguồn sự thật cho cả frontend và backend): [`../vocabulary_japan_fe/API_CONTRACT.md`](../vocabulary_japan_fe/API_CONTRACT.md).
Cấu trúc thư mục và mô tả từng file: [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md).

## Chạy trên máy

Cần Node.js ≥ 22 và Docker.

```bash
cp .env.example .env          # dùng được ngay cho máy dev
docker compose up -d          # PostgreSQL dev (cổng 5432) và test (cổng 5433)
npm install                   # cài gói, tự sinh Prisma Client
npm run db:migrate            # tạo bảng
npm run db:seed               # từ vựng + dạng mondai + đề mẫu số 11 + tài khoản mẫu + lịch sử mẫu
npm run dev                   # http://localhost:4000/api/health → {"ok":true}
```

## Tài khoản mẫu

Tạo bởi `npm run db:seed` (chỉ khi `NODE_ENV` khác `production`):

| Email | Mật khẩu | Vai trò | Dữ liệu có sẵn |
|---|---|---|---|
| `user@example.com` | `123456` | user | 25 từ N5 đã học, 8 từ cần ôn hôm nay, 20/30 ngày gần nhất có học, streak 4 |
| `admin@example.com` | `123456` | admin | chưa học từ nào |

Lịch sử mẫu tính theo ngày chạy seed. Mỗi lần chạy `npm run db:seed`, lịch sử của `user@example.com` được tạo lại cho đúng hôm nay; tiến độ bạn tự học bằng tài khoản này sẽ mất. Cài đặt (số từ mỗi ngày, cấp độ…) của tài khoản đã có thì giữ nguyên.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | chạy API, tự khởi động lại khi sửa code |
| `npm run build` / `npm start` | build ra `dist/` / chạy bản build |
| `npm run typecheck` | kiểm tra kiểu TypeScript |
| `npm test` | toàn bộ test (domain + API trên DB test cổng 5433) |
| `npm run db:migrate` | tạo migration mới từ `prisma/schema.prisma` và áp dụng (dev) |
| `npm run db:deploy` | áp dụng migration có sẵn (production) |
| `npm run db:seed` | thêm từ vựng và dạng mondai còn thiếu; ngoài production thêm đề mẫu số 11 (đã xuất bản), tài khoản và lịch sử mẫu |
| `npm run db:reset` | xóa sạch DB dev rồi migrate và seed lại |
| `npm run create-admin -- --email … --password … [--name …]` | tạo hoặc nâng quyền admin (dùng cho production) |

Test chỉ chạy trên DB test (cổng 5433) và từ chối chạy nếu `DATABASE_URL_TEST` trỏ vào DB khác, vì test xóa sạch dữ liệu giữa các lần chạy.

## Biến môi trường

Xem chú thích đầy đủ trong `.env.example`. Server kiểm tra mọi biến lúc khởi động; sai thì in rõ biến nào sai rồi dừng.

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `DATABASE_URL` | (bắt buộc) | PostgreSQL |
| `DATABASE_URL_TEST` | `…@localhost:5433/jpvocab_test` | chỉ dùng khi chạy test |
| `PORT` | `4000` | |
| `HOST` | mọi địa chỉ | để trống trong Docker (container chỉ nằm trong mạng nội bộ của compose) |
| `CORS_ORIGIN` | (bắt buộc) | origin của frontend, ví dụ `http://localhost:5173`; cũng dùng để kiểm tra Origin chống CSRF |
| `SESSION_TTL_DAYS` | `30` | thời hạn phiên đăng nhập |
| `COOKIE_SECURE` | `false` | `true` khi chạy HTTPS; bắt buộc ở production |
| `COOKIE_SAME_SITE` | `lax` | `none` chỉ khi frontend và API khác domain (cần `COOKIE_SECURE=true`) |
| `APP_TIMEZONE` | `Asia/Ho_Chi_Minh` | múi giờ tính "hôm nay", tuần, streak |
| `LOG_LEVEL` | `info` | |
| `TRUST_PROXY` | `loopback` | chỉ tin header X-Forwarded-* từ proxy trên cùng máy |
| `UPLOAD_DIR` | `uploads` | thư mục ảnh của bài đọc đề thi; Docker đặt `/app/uploads` (volume riêng) |

## Kết nối với frontend

Frontend ở thư mục bên cạnh (`../vocabulary_japan_fe`) đã có sẵn proxy `/api` → `http://localhost:4000` trong `vite.config.ts`. Trình duyệt thấy frontend và API cùng một origin, nên cookie hoạt động và không cần CORS.

```bash
# Cửa sổ 1: backend
npm run dev

# Cửa sổ 2: frontend
cd ../vocabulary_japan_fe
npm run dev                         # http://localhost:5173
```

Đăng nhập bằng `user@example.com` / `123456`.

Lưu ý:
- Frontend phải chạy đúng cổng 5173, trùng `CORS_ORIGIN`. Cổng khác thì mọi thao tác lưu bị 403 do kiểm tra Origin. `vite.config.ts` đã bật `strictPort`, nên cổng 5173 bận thì Vite báo lỗi thay vì tự đổi cổng.
- Chạy frontend ở cổng khác: đặt `CORS_ORIGIN` của backend theo cổng đó, ví dụ `CORS_ORIGIN=http://localhost:5175 npm run dev`.

## Thêm từ vựng

**Trang Quản trị** (đăng nhập bằng tài khoản admin, mở `/quan-tri`): thêm, sửa, xóa từ trực tiếp trong DB. Từ mới tìm được ngay.

**Dữ liệu gốc** (`prisma/seed-data/words.json`, `topics.json`): nguồn duy nhất của bộ từ. Frontend giữ một bản sao chỉ để chạy test (`../vocabulary_japan_fe/src/test/mock/data/`). Khi thêm từ vào dữ liệu gốc:
1. Sửa file ở `prisma/seed-data/`.
2. Chép sang frontend rồi chạy `npm test` ở đó để kiểm tra dữ liệu hợp lệ: `cp prisma/seed-data/*.json ../vocabulary_japan_fe/src/test/mock/data/`.
3. `npm run db:seed`. Seed chỉ **thêm** từ còn thiếu (theo id), không ghi đè từ đã có, nên không mất chỉnh sửa đã làm ở trang Quản trị. Muốn áp dụng lại toàn bộ dữ liệu gốc trên máy dev thì dùng `npm run db:reset`.

## Luyện đề JLPT (SRS 2.0)

- Định dạng file nhập đề: [EXAM_IMPORT_FORMAT.md](EXAM_IMPORT_FORMAT.md). Đề mẫu: `prisma/seed-data/exams/n4-de-luyen-11.json`.
- Ảnh của bài đọc lưu ở `UPLOAD_DIR` (mặc định `uploads/`, không đưa lên git; Docker: volume `uploads`).
- Endpoint và kiểu dữ liệu: `../vocabulary_japan_fe/API_CONTRACT.md`, mục "Luyện đề JLPT" và phụ lục J.

## Deploy

Deploy bằng Docker Compose (Caddy + HTTPS tự động): [`../DEPLOY.md`](../DEPLOY.md). Image API build từ `Dockerfile` trong thư mục này; `docker-compose.yml` production và `deploy/` nằm ở thư mục gốc repo.

Deploy bản mới sau lần cài đầu tiên: `/opt/jpvocab/deploy/deploy.sh` trên server.
