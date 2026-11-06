---
name: backend-dev
description: Quy tắc viết code cho vocabulary_japan_be (Express 5 + Prisma 7 + PostgreSQL). Dùng khi tạo hoặc sửa module API, service, middleware, schema Prisma, migration, seed, hoặc test backend.
---

# Backend – jpvocab API

Vai trò từng file: `vocabulary_japan_be/PROJECT_STRUCTURE.md`. Hợp đồng: `vocabulary_japan_fe/API_CONTRACT.md` (đổi API thì theo skill `api-change`).

## Cấu trúc module

Mỗi nhóm endpoint là một thư mục `src/modules/<nhóm>/`:

- `schemas.ts` – zod cho body/query/params.
- `service.ts` – toàn bộ nghiệp vụ và truy vấn Prisma. Nhận tham số đã validate, trả object đúng hình dạng hợp đồng (qua `src/serializers/` nếu dùng chung).
- `routes.ts` – **chỉ validate rồi gọi service**: `schema.parse(req.body)` → `res.json(await service(...))`. Không viết logic trong route. Lấy người dùng bằng `currentUser(req)`.
- Router gắn vào `src/app.ts` dưới `/api`. Route cụ thể (`/words/today`) đặt trước route có tham số (`/words/:id`).

## Lỗi

- Nghiệp vụ ném `ApiError(status, code, message, fields?, details?)` (`src/utils/ApiError.ts`). `message` tiếng Việt cho người dùng đọc.
- Không tự `res.status(...).json({ error })`: error handler duy nhất (`src/middleware/errorHandler.ts`) lo việc đổi `ApiError`, `ZodError` thành JSON.
- Lỗi zod tự đổi thành `fields` bằng `zodFieldErrors` (`src/utils/zodFields.ts`).

## Dữ liệu

- Bảng và cột snake_case (`@@map`, `@map`), thời gian `timestamptz`. Thêm index phải có lý do ghi trong comment.
- Đổi schema: sửa `prisma/schema.prisma` → `npm run db:migrate` (đặt tên migration có nghĩa) → commit cả thư mục migration. Không sửa migration đã có.
- Thao tác nhiều bảng đi chung trong `prisma.$transaction`. Chống ghi song song bằng khóa dòng (`SELECT … FOR UPDATE`) hoặc `UPDATE … WHERE` có điều kiện (ví dụ `submitted_at IS NULL`).
- "Hôm nay", tuần, streak tính theo `APP_TIMEZONE` (mặc định `Asia/Ho_Chi_Minh`) bằng hàm trong `src/domain/dates.ts`, không dùng giờ máy.
- Tìm kiếm ILIKE phải qua `escapeLike`. Phân trang qua `src/utils/pagination.ts`.
- Mật khẩu băm argon2id; email trim + chữ thường (`normalizeEmail`). Không log mật khẩu, cookie, token.

## Domain dùng chung với frontend

`src/domain/` (`srs`, `streak`, `quiz`, `today`, `normalize`, `dates`, `random`, `markup`, `exam`) là hàm thuần, chép tương ứng với `vocabulary_japan_fe/src/utils/`. Sửa một bên thì sửa bên kia, giữ cùng test.

## Chạy trực tiếp bằng Node

`prisma/seed.ts` và `src/scripts/create-admin.ts` chạy thẳng bằng Node 24 (chỉ xóa kiểu). Vì vậy trong code mà chúng import: không dùng parameter property, enum, namespace; import ghi đuôi `.ts`.

## Seed

- `npm run db:seed` chỉ **thêm** dữ liệu còn thiếu, không ghi đè chỉnh sửa của quản trị viên.
- Tài khoản mẫu, lịch sử mẫu, đề mẫu chỉ tạo khi `NODE_ENV` khác `production`.

## Test

- Vitest, chạy trên DB test cổng 5433 (`docker compose up -d` trong thư mục backend). Test từ chối chạy nếu `DATABASE_URL_TEST` trỏ DB khác.
- Test API ở `tests/api/<nhóm>.test.ts` qua helper `tests/helpers/api.ts`; dữ liệu qua `tests/helpers/fixtures.ts`.
- Response mới phải có schema strict trong `tests/helpers/contract.ts`. `contract.test.ts` kiểm tra mọi endpoint trong bảng của `API_CONTRACT.md` đều được gọi.
- Luôn test: chưa đăng nhập (401), không phải admin (403), dữ liệu của người khác (404/cách ly), dữ liệu sai (400 + `fields`), ghi song song khi có.
- Chạy `npm run typecheck && npm test`.
