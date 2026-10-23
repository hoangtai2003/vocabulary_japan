# Sổ luyện chữ — Frontend

App học từ vựng tiếng Nhật (JLPT N5–N4). React 18 + TypeScript + Vite + Tailwind v4, TanStack Query, React Router.

Hợp đồng API (nguồn sự thật cho cả frontend và backend): [`API_CONTRACT.md`](API_CONTRACT.md).
Thiết kế giao diện: [`DESIGN.md`](DESIGN.md). Cấu trúc thư mục và mô tả từng file: [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md).
Backend: [`../vocabulary_japan_be`](../vocabulary_japan_be/README.md).

## Chạy trên máy

Cần Node.js ≥ 22. Frontend luôn gọi backend thật, nên cần chạy backend trước.

```bash
# Cửa sổ 1: backend (xem README của backend để chuẩn bị DB)
cd ../vocabulary_japan_be && npm run dev

# Cửa sổ 2: frontend
npm install
npm run dev                   # http://localhost:5173
```

Vite chuyển `/api` sang `http://localhost:4000` (đổi bằng `API_PROXY_TARGET`), nên trình duyệt thấy frontend và API cùng một origin: cookie hoạt động, không cần CORS. Đăng nhập bằng tài khoản do `npm run db:seed` của backend tạo (xem README backend).

Frontend phải chạy đúng cổng 5173, trùng `CORS_ORIGIN` của backend, nếu không mọi thao tác lưu bị 403. `vite.config.ts` bật `strictPort`, nên cổng bận thì Vite báo lỗi thay vì tự đổi cổng.

## Biến môi trường

Đặt trong `.env.local` (chép từ `.env.example`) hoặc ngay trước lệnh. Biến `VITE_*` được gắn vào bản build lúc build, đổi giá trị thì phải build lại.

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `VITE_API_URL` | rỗng | URL gốc backend; rỗng = gọi `/api` trên chính domain của frontend (khuyến nghị) |
| `API_PROXY_TARGET` | `http://localhost:4000` | chỉ dùng cho `npm run dev`: đích proxy `/api` |

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | chạy dev server ở cổng 5173 |
| `npm run build` | kiểm tra kiểu (`tsc -b`) rồi build ra `dist/` |
| `npm run preview` | xem thử bản build trong `dist/` |
| `npm run typecheck` | kiểm tra kiểu TypeScript |
| `npm test` | toàn bộ test (Vitest + MSW node: API giả lập trong `src/test/mock/`, chỉ dùng cho test) |

## Build production

```bash
npm ci
VITE_API_URL= npm run build
```

Thư mục đầu ra: **`dist/`** (`index.html`, `assets/` với tên file có hash, cùng các file chép nguyên từ `public/`).

`VITE_API_URL` để trống: frontend gọi `/api` trên chính domain của nó. Máy chủ web phục vụ `dist/` cần:
- chuyển `/api/` vào backend;
- SPA fallback: đường dẫn không phải file thì trả `/index.html`, để tải lại trang ở `/tu-vung`, `/quan-tri`… vẫn mở được app;
- không cache `index.html`; `assets/` cache lâu được.

Ở production, `Dockerfile` trong thư mục này build `dist/` rồi đóng gói vào image Caddy; Caddy lo cả ba việc (`../deploy/Caddyfile`). Hướng dẫn đầy đủ: [`../DEPLOY.md`](../DEPLOY.md).
