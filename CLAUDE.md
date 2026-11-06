# Sổ luyện chữ (jpvocab)

App học từ vựng và luyện đề JLPT (N5–N4) cho người Việt. Monorepo gồm hai phần:

| Thư mục | Công nghệ |
|---|---|
| `vocabulary_japan_fe/` | React 18, TypeScript, Vite, Tailwind v4, TanStack Query, React Router 6, zod, Vitest + MSW |
| `vocabulary_japan_be/` | Node 24, Express 5, TypeScript, PostgreSQL 17, Prisma 7, zod, Vitest |
| `deploy/`, `docker-compose.yml` | Production: Docker Compose + Caddy |

## Tài liệu gốc (nguồn sự thật, không chép nội dung sang chỗ khác)

| File | Nội dung |
|---|---|
| `vocabulary_japan_fe/API_CONTRACT.md` | Hợp đồng API cho cả FE và BE: endpoint, mã lỗi, kiểu dữ liệu, phụ lục luật đã chốt. Test `tests/api/contract.test.ts` của BE đọc thẳng các bảng trong file này |
| `vocabulary_japan_fe/DESIGN.md` | Hệ thiết kế: token màu, font, wireframe, các lần tự phê bình |
| `vocabulary_japan_be/EXAM_IMPORT_FORMAT.md` | Định dạng file nhập đề, cú pháp đánh dấu, dạng mondai |
| `*/PROJECT_STRUCTURE.md` | Mô tả từng file của mỗi bên |
| `*/README.md`, `DEPLOY.md` | Cách chạy, biến môi trường, deploy |
| `SRS 2.0 – Module luyện đề JLPT (đề xuất).docx` | Đặc tả gốc của module luyện đề (mã DR-EX-*, FR-*, NFR-*) |

## Skill và agent

Đọc skill tương ứng **trước khi** làm loại việc đó:

| Việc | Skill |
|---|---|
| Thêm/sửa endpoint, đổi hình dạng dữ liệu, mã lỗi | `api-change` |
| Viết code frontend: trang, component, hook, giao diện | `frontend-dev` |
| Viết code backend: module, Prisma, migration, test | `backend-dev` |
| Soạn, nhập, sửa đề thi JLPT | `exam-content` |
| Thêm/sửa từ vựng, chủ đề trong dữ liệu gốc | `vocabulary-data` |
| Deploy, thao tác trên server production | `deploy` (chỉ chạy khi người dùng gọi) |

Agent để soát sau khi sửa: `contract-reviewer` (FE, BE và hợp đồng có khớp nhau), `design-reviewer` (giao diện có đúng DESIGN.md).

## Quy tắc chung

1. **Hợp đồng trước, code sau.** Mọi thay đổi API bắt đầu bằng sửa `API_CONTRACT.md`, rồi mới sửa BE, FE và mock test. Không để FE và BE lệch nhau.
2. **Logic chép đôi phải giữ giống nhau.** Các hàm thuần có ở cả hai bên: BE `src/domain/` ↔ FE `src/utils/` gồm `srs`, `streak`, `quiz`, `today`, `normalize`, `dates`, `random`, `markup`, `exam`. Sửa một bên thì sửa bên kia và chạy test cả hai.
3. **Dữ liệu từ vựng gốc** nằm ở `vocabulary_japan_be/prisma/seed-data/`. FE chỉ giữ bản sao cho test ở `src/test/mock/data/`.
4. **Mock chỉ dùng cho test.** App chạy thật luôn gọi backend. Không thêm lại chế độ mock, tài khoản mẫu trên giao diện, hay dữ liệu cứng trong code app.
5. **Tiếng Việt** cho mọi chữ trên giao diện, thông báo lỗi API (`message`), comment, tài liệu và commit message. Tên biến, hàm, file bằng tiếng Anh. Đường dẫn trang bằng tiếng Việt không dấu (`/tu-vung`, `/on-tap`, `/quan-tri/de-thi`).
6. **Phiên bản gói cố định** (không `^`, `~`). Thêm gói mới phải ghi đúng phiên bản.
7. **JSON của API dùng snake_case** (`display_name`, `due_at`). Code TS bên trong dùng camelCase trừ kiểu khớp hợp đồng.
8. Sửa xong phải chạy **typecheck và test** của phần bị ảnh hưởng (lệnh ở dưới), báo đúng kết quả.
9. Thêm/xóa/đổi vai trò file thì cập nhật `PROJECT_STRUCTURE.md` của bên đó. Đổi cách chạy hay biến môi trường thì cập nhật README.
10. Không commit khi người dùng chưa yêu cầu.

## Lệnh

```bash
# Backend (cần docker compose up -d trong vocabulary_japan_be: DB dev 5432, DB test 5433)
cd vocabulary_japan_be && npm run typecheck && npm test
npm run dev            # http://localhost:4000
npm run db:migrate     # tạo migration từ schema.prisma
npm run db:seed        # từ vựng, dạng mondai, đề mẫu, tài khoản mẫu (ngoài production)

# Frontend (dev cần backend đang chạy; Vite proxy /api → :4000, cổng 5173 cố định)
cd vocabulary_japan_fe && npm run typecheck && npm test
npm run dev            # http://localhost:5173
npm run build
```

Tài khoản mẫu ở máy dev (do seed tạo): `user@example.com` / `123456`, `admin@example.com` / `123456`.
