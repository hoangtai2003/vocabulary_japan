---
name: frontend-dev
description: Quy tắc viết code và giao diện cho vocabulary_japan_fe (React + Tailwind v4, hệ thiết kế "Sổ luyện chữ"). Dùng khi tạo hoặc sửa trang, component, hook, store, style, test của frontend.
---

# Frontend – Sổ luyện chữ

Chi tiết đầy đủ: `vocabulary_japan_fe/DESIGN.md` (thiết kế), `vocabulary_japan_fe/PROJECT_STRUCTURE.md` (vai trò từng file). Đọc phần liên quan trước khi làm trang mới.

## Kiến trúc

- `src/components/ui/` không biết gì về API. Dùng lại `Button`, `Input`, `Select`, `Textarea`, `Modal`, `Toast`, `Skeleton`, `EmptyState`, `ErrorState`, `ProgressBar`, `GenkoMark`, `Seal`, `Card`, `OptionGroup` trước khi tạo cái mới.
- **Component không gọi `fetch` hay module API trực tiếp.** Luồng dữ liệu: `src/api/client.ts` (fetch wrapper duy nhất, ném `ApiError`) → `src/api/*Api.ts` → `src/hooks/queries/*` (TanStack Query) → component.
- Query key chỉ khai báo ở `src/api/queryKeys.ts`.
- Mỗi route một file ở `src/pages/`, lazy load trong `src/router.tsx`. Mỗi trang gọi `useDocumentTitle('…')`. Trang cần cột rộng 1120px thì đặt `handle.wide` trên route.
- Form: react-hook-form + zod (`src/schemas/`). Lỗi từ API gắn vào ô bằng `applyApiErrors` (`src/utils/formErrors.ts`).
- Trạng thái toàn cục nhỏ dùng zustand (`src/stores/`). Bộ lọc của trang danh sách để trên URL (`useWordFilters`).
- `?next=` chỉ nhận đường dẫn nội bộ (`safeNext`).
- Hàm thuần trong `src/utils/` (`srs`, `streak`, `quiz`, `today`, `normalize`, `dates`, `markup`, `exam`) là bản chép của backend `src/domain/`: sửa thì sửa cả hai bên.
- Không có chế độ mock trong app. Không hardcode dữ liệu mẫu, tài khoản mẫu.

## Thiết kế (bắt buộc)

App trông như vở tập viết tiếng Nhật: giấy ngà, mực, ô kẻ genkō, con dấu son.

- **Chỉ dùng token màu** trong `src/index.css` (`paper`, `surface`, `ink`, `ink-muted`, `rule`, `rule-strong`, `son`, `on-son`, `son-ink`, `son-wash`, `moss`, `moss-ink`, `moss-wash`), không viết mã màu thẳng.
  - `son` là màu nhấn **duy nhất**. Chữ son trên giấy dùng `son-ink`.
  - `moss` chỉ để tô nền. Chữ trạng thái đúng dùng `moss-ink`.
  - `rule` chỉ để kẻ trang trí. Viền ô nhập, nút phụ dùng `rule-strong`.
- **Không gradient, không bóng đổ.** Tách lớp bằng viền 1px và nền `surface`. Bo 6px (nút, ô nhập), 10px (thẻ).
- **Font**: Fraunces (tiêu đề), Be Vietnam Pro (nội dung), Noto Serif JP (chữ Nhật lớn), Noto Sans JP (chữ Nhật trong giao diện). Thang cỡ 12 · 14 · 16 · 18 · 22 · 28 · 36. Số đếm dùng `tabular-nums`.
- **Focus** rõ trên mọi phần tử: viền son 2px, `outline-offset: 2px`.
- **Chuyển động** ngắn (180–400 ms), và có bản thay thế khi `prefers-reduced-motion: reduce`.
- **Icon** chỉ khi mang chức năng, không trang trí cạnh tiêu đề.
- **Tránh vẻ "SaaS mặc định"**: không hàng ô KPI, không mục điều hướng tô nền dạng pill, không spinner giữa trang (dùng skeleton đúng hình nội dung), không toast có icon tròn nền đậm, vùng nguy hiểm không tô nền đỏ.
- **Bố cục**: nội dung rộng tối đa 720px; lề 16px điện thoại, 32px desktop. Phải dùng được ở 360px, không cuộn ngang trang (bảng rộng thì cuộn trong khung riêng). Điện thoại chừa chỗ cho thanh điều hướng dưới + `safe-area-inset-bottom`.
- Dark mode qua class `.dark` trên `<html>`. Kiểm tra cả hai chế độ.

## Trợ năng và hành vi

- Biểu đồ phải có cách đọc bằng bảng. Màu dữ liệu chọn theo skill `dataviz` và kiểm bằng validator, không chọn bằng mắt.
- Phím tắt bỏ qua khi đang gõ hoặc có modal; Space/Enter không được bấm nhầm nút đang focus.
- Trạng thái không chỉ thể hiện bằng màu: kèm chữ, ký hiệu hoặc hình.
- Mỗi trang có đủ ba trạng thái: đang tải (skeleton), lỗi (`ErrorState` có nút thử lại), rỗng (`EmptyState` với câu đúng ngữ cảnh).
- Chữ trên giao diện tiếng Việt, ngắn, thể chủ động. So sánh chuỗi người dùng gõ thì chuẩn hóa NFC.

## Test

- Vitest + Testing Library + MSW node. Mock API chỉ ở `src/test/mock/` (handler, seed, dữ liệu).
- Test trang dùng `renderApp(path, { as: SAMPLE_USER_ID | SAMPLE_ADMIN_ID })` từ `src/test/renderApp.tsx`: router thật, client thật.
- Ghi đè response trong một test bằng `server.use(http.get('/api/…', …))`.
- Truy vấn theo vai trò và nhãn (`getByRole`, `getByLabelText`), không theo class.
- Tên test bằng tiếng Việt, mô tả hành vi.
- Chạy `npm run typecheck && npm test`. Sửa giao diện lớn thì chạy `npm run build` và xem thử ở 360px và 1280px, sáng và tối.

Sau khi sửa giao diện, có thể gọi agent `design-reviewer` để soát.
