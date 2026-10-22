# Sổ luyện chữ — Frontend

App học từ vựng tiếng Nhật (JLPT N5–N4). React 18 + TypeScript + Vite + Tailwind v4, TanStack Query, React Router.

Hợp đồng API (nguồn sự thật cho cả frontend và backend): [`API_CONTRACT.md`](API_CONTRACT.md).
Thiết kế giao diện: [`DESIGN.md`](DESIGN.md). Cấu trúc thư mục và mô tả từng file: [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md).
Backend: [`../vocabulary_japan_be`](../vocabulary_japan_be/README.md).

## Chạy trên máy

Cần Node.js ≥ 22.

```bash
npm install
npm run dev                   # http://localhost:5173, chế độ mock
```

Mặc định app chạy ở **chế độ mock**: không cần backend, MSW chặn mọi request `/api` trong trình duyệt và trả dữ liệu giả lưu trong `localStorage`.

## Tài khoản mẫu (chế độ mock)

Trang đăng nhập có hộp chọn nhanh hai tài khoản này:

| Email | Mật khẩu | Vai trò |
|---|---|---|
| `user@example.com` | `123456` | user, đã có khoảng 30 ngày lịch sử học |
| `admin@example.com` | `123456` | admin, mở được `/quan-tri` |

Lịch sử mẫu được tạo theo ngày mở app lần đầu, rồi giữ trong `localStorage` (khóa có tiền tố `jpvocab:`).

**Đặt lại dữ liệu mock:** trang Hồ sơ → cuối trang, mở "Công cụ chế độ thử nghiệm" → "Đặt lại dữ liệu mẫu". Mọi tiến độ, ghi chú, tài khoản tự tạo và từ đã thêm bị xóa, hai tài khoản mẫu được tạo lại theo hôm nay. Cách khác: xóa các khóa `jpvocab:*` trong `localStorage` rồi tải lại trang.

**Thử giao diện lỗi:** thêm `?mockError=1` vào URL trang, mọi request (trừ `/auth/*`) trả 500.

## Chạy với backend thật

```bash
# Cửa sổ 1: backend (xem README của backend để chuẩn bị DB)
cd ../vocabulary_japan_be && npm run dev

# Cửa sổ 2: frontend
VITE_API_MODE=real npm run dev      # http://localhost:5173
```

Vite chuyển `/api` sang `http://localhost:4000` (đổi bằng `API_PROXY_TARGET`), nên trình duyệt thấy frontend và API cùng một origin: cookie hoạt động, không cần CORS. Ở chế độ real, hộp tài khoản mẫu và công cụ đặt lại dữ liệu không hiện; đăng nhập bằng tài khoản do `npm run db:seed` của backend tạo.

Frontend phải chạy đúng cổng 5173, trùng `CORS_ORIGIN` của backend, nếu không mọi thao tác lưu bị 403. `vite.config.ts` bật `strictPort`, nên cổng bận thì Vite báo lỗi thay vì tự đổi cổng.

## Biến môi trường

Đặt trong `.env.local` (chép từ `.env.example`) hoặc ngay trước lệnh. Biến `VITE_*` được gắn vào bản build lúc build, đổi giá trị thì phải build lại.

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `VITE_API_MODE` | `mock` | `mock` (MSW + `localStorage`) hoặc `real` (gọi backend) |
| `VITE_API_URL` | rỗng | URL gốc backend; rỗng = gọi `/api` trên chính domain của frontend (khuyến nghị) |
| `API_PROXY_TARGET` | `http://localhost:4000` | chỉ dùng cho `npm run dev`: đích proxy `/api` |

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | chạy dev server ở cổng 5173 |
| `npm run build` | kiểm tra kiểu (`tsc -b`) rồi build ra `dist/` |
| `npm run preview` | xem thử bản build trong `dist/` |
| `npm run typecheck` | kiểm tra kiểu TypeScript |
| `npm test` | toàn bộ test (Vitest + MSW node, luôn ở chế độ mock) |

## Build production

```bash
npm ci
VITE_API_MODE=real VITE_API_URL= npm run build
```

Thư mục đầu ra: **`dist/`** (`index.html`, `assets/` với tên file có hash, cùng các file chép nguyên từ `public/`). Ở chế độ real, code mock (MSW, dữ liệu mẫu) vẫn có trong `assets/` dưới dạng chunk riêng nhưng không bao giờ được tải; `mockServiceWorker.js` cũng không được đăng ký.

`VITE_API_URL` để trống: frontend gọi `/api` trên chính domain của nó. Máy chủ web phục vụ `dist/` cần:
- chuyển `/api/` vào backend;
- SPA fallback: đường dẫn không phải file thì trả `/index.html`, để tải lại trang ở `/tu-vung`, `/quan-tri`… vẫn mở được app;
- không cache `index.html`; `assets/` cache lâu được.

Ở production, `Dockerfile` trong thư mục này build `dist/` rồi đóng gói vào image Caddy; Caddy lo cả ba việc (`../deploy/Caddyfile`). Hướng dẫn đầy đủ: [`../DEPLOY.md`](../DEPLOY.md).
