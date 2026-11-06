---
name: api-change
description: Quy trình thêm hoặc sửa endpoint, hình dạng response, mã lỗi hay luật nghiệp vụ dùng chung giữa frontend và backend của jpvocab. Dùng mỗi khi thay đổi chạm tới API_CONTRACT.md, src/types của FE, schema zod của BE, hoặc mock handler trong test.
---

# Thay đổi API

`vocabulary_japan_fe/API_CONTRACT.md` là nguồn sự thật duy nhất. Đọc mục liên quan và **phụ lục** của nó trước khi sửa.

## Thứ tự làm

1. **Hợp đồng** – sửa `API_CONTRACT.md`:
   - Endpoint mới thêm vào đúng bảng của nhóm, dạng `| METHOD | \`/duong-dan/:id\` | body/query | trả về |`. Test hợp đồng của BE đọc các bảng này để biết phải gọi endpoint nào.
   - Endpoint tạm hoãn đánh dấu `⏸` (test bỏ qua).
   - Luật chưa rõ trong bảng (sắp xếp, giới hạn, lỗi theo trường) ghi vào phụ lục của nhóm.
   - Mã lỗi mới thêm vào bảng mục 4.4.
2. **Backend** (`vocabulary_japan_be`, xem skill `backend-dev`):
   - `src/modules/<nhóm>/schemas.ts` (zod) → `service.ts` → `routes.ts`.
   - Mã lỗi mới: thêm vào `ErrorCode` trong `src/utils/ApiError.ts`.
   - Schema response strict trong `tests/helpers/contract.ts`, test trong `tests/api/<nhóm>.test.ts`.
3. **Frontend** (`vocabulary_japan_fe`, xem skill `frontend-dev`):
   - Kiểu ở `src/types/` → hàm ở `src/api/<nhóm>Api.ts` (có kiểu tham số và kiểu trả về) → query key ở `src/api/queryKeys.ts` → hook ở `src/hooks/queries/`.
   - Mock handler ở `src/test/mock/handlers/<nhóm>.ts` phải làm đúng luật như BE.
4. **Kiểm tra**: `npm run typecheck && npm test` ở **cả hai** thư mục. Có thể gọi agent `contract-reviewer` để soát độ lệch.

## Quy ước bắt buộc

- Mọi đường dẫn có tiền tố `/api`. JSON dùng snake_case.
- Danh sách phân trang: `{ items, page, page_size, total }`. `page` từ 1, `page_size` mặc định 20, tối đa 100; giá trị sai thì dùng mặc định, không báo lỗi.
- Lỗi luôn là `{ error: { code, message, fields?, details? } }`. `message` bằng tiếng Việt, hiển thị thẳng cho người dùng. `fields` là `{ tên_trường: thông_báo }` để FE gắn vào đúng ô của form.
- **Không trả 401 cho lỗi sai mật khẩu hiện tại** (đổi mật khẩu, xóa tài khoản): trả 400 `VALIDATION_ERROR` với `fields`. Client coi mọi 401 (trừ `/auth/login`, `/auth/me`) là hết phiên và đăng xuất.
- Endpoint quản trị: không phải admin thì 403. Tài nguyên của người khác thì 404, không phải 403.
- Thành công trả 200; tạo mới 201; không có nội dung 204.
- Thao tác thêm/xóa làm đổi cấu trúc (cây đề) trả trọn cây; sửa từng phần chỉ trả phần vừa sửa.
- Server không tin số liệu client tự tính (điểm, đáp án đúng): luôn chấm lại bằng dữ liệu đã lưu.
- Trước khi một phần thi có bấm giờ được nộp, response cho người học không chứa `correct_option`, `star_order`, `explanation`, `learner_note`.

## Sau khi đổi

- Mutation ở FE phải invalidate đúng query bị ảnh hưởng (ví dụ chấm thẻ → `reviews.due`, `words.today`, `stats.*`). Thao tác nhỏ, hay bấm (yêu thích, ghi chú) dùng optimistic update.
- Có endpoint FE không gọi (như `/health`) vẫn phải nằm trong hợp đồng.
