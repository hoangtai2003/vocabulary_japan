# Hợp đồng API – App học từ vựng tiếng Nhật

Chép nguyên từ mục 4 của prompt frontend. Đây là nguồn sự thật duy nhất cho cả frontend (mock) và backend.
Kiểu dữ liệu (`User`, `Word`, `WordWithState`, …) xem mục 3 của prompt, bản TypeScript ở `src/types/`.
Các chi tiết đã chốt khi làm frontend nằm ở **Phụ lục** cuối file.

## 4.1 Biến môi trường

| Biến            | Giá trị                                          | Mặc định               |
| --------------- | ------------------------------------------------ | ---------------------- |
| `VITE_API_MODE` | `mock` hoặc `real`                               | `mock`                 |
| `VITE_API_URL`  | URL gốc backend, ví dụ `https://api.example.com` | rỗng (gọi cùng domain) |

## 4.2 Client và cách tổ chức

- Một client duy nhất ở `src/api/client.ts`: fetch wrapper, tiền tố `/api`, `credentials: "include"`, header JSON, timeout 15 giây.
- Response lỗi luôn có dạng `{ error: { code, message, fields? } }`. Client ném `ApiError` có `status`, `code`, `message`, `fields`.
- Khi nhận 401 ở bất kỳ request nào trừ `/auth/login` và `/auth/me`: xóa cache người dùng và chuyển về `/dang-nhap?next=<trang hiện tại>`.
- Các module: `authApi`, `wordsApi`, `reviewApi`, `quizApi`, `statsApi`, `meApi`, `adminApi`. Mỗi hàm có kiểu tham số và kiểu trả về.
- Custom hook bọc TanStack Query ở `src/hooks/queries/`. Component không bao giờ gọi fetch hay module API trực tiếp.
- Query keys tập trung ở `src/api/queryKeys.ts`. Sau khi chấm điểm một thẻ, invalidate `reviews.due`, `words.today` và `stats.*`. Thao tác yêu thích và ghi chú dùng optimistic update.

## 4.3 Chế độ mock

- Dùng MSW v2: `src/mock/handlers/*.ts`, khởi động worker trong `main.tsx` chỉ khi `VITE_API_MODE=mock`. Code ở chế độ mock và real phải đi qua cùng một client.
- Dữ liệu mock lưu trong localStorage với khóa có tiền tố `jpvocab:`, có hàm reset về dữ liệu gốc (nút ẩn ở trang Hồ sơ khi đang ở chế độ mock).
- Mô phỏng độ trễ ngẫu nhiên 300–600 ms. Có thể bật giả lập lỗi bằng `?mockError=1` trên URL để kiểm tra giao diện lỗi.
- Phiên đăng nhập giả: lưu id người dùng hiện tại trong localStorage, mật khẩu băm SHA-256 bằng Web Crypto.
- SRS chạy trong handler mock bằng cùng hàm ở `src/utils/srs.ts` (mục 5), để có thể test riêng.

## 4.4 Mã lỗi

| HTTP | code                  | Khi nào                                              |
| ---- | --------------------- | ---------------------------------------------------- |
| 400  | `VALIDATION_ERROR`    | Dữ liệu sai. `fields` là `{ tên_trường: thông_báo }` |
| 401  | `UNAUTHORIZED`        | Chưa đăng nhập hoặc phiên hết hạn                    |
| 401  | `INVALID_CREDENTIALS` | Sai email hoặc mật khẩu khi đăng nhập                |
| 403  | `FORBIDDEN`           | Không đủ quyền (không phải admin)                    |
| 404  | `NOT_FOUND`           | Không tìm thấy tài nguyên                            |
| 409  | `EMAIL_TAKEN`         | Email đã được đăng ký                                |
| 429  | `RATE_LIMITED`        | Gửi quá nhiều request                                |
| 500  | `INTERNAL_ERROR`      | Lỗi server                                           |

## 4.5 Endpoint

Mọi đường dẫn có tiền tố `/api`. Thành công trả 200 trừ khi ghi khác. Danh sách phân trang luôn có dạng `{ items, page, page_size, total }`.

### Hệ thống

| Method | Đường dẫn | Body / Query | Trả về          |
| ------ | --------- | ------------ | --------------- |
| GET    | `/health` |              | `{ ok: true }`  |

Không cần đăng nhập. Dùng để kiểm tra server khi deploy (thêm theo prompt backend, mục 3.1).

### Xác thực

| Method | Đường dẫn        | Body / Query                        | Trả về                    |
| ------ | ---------------- | ----------------------------------- | ------------------------- |
| POST   | `/auth/register` | `{ email, password, display_name }` | 201 `{ user: User }`      |
| POST   | `/auth/login`    | `{ email, password }`               | `{ user: User }`          |
| POST   | `/auth/logout`   |                                     | 204                       |
| GET    | `/auth/me`       |                                     | `{ user: User }` hoặc 401 |

### Từ vựng

| Method | Đường dẫn             | Body / Query                                                       | Trả về                                                              |
| ------ | --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| GET    | `/words/today`        |                                                                    | `{ date, goal, new_words: WordWithState[], learned_today: number }` |
| GET    | `/words`              | `level, topic, q, favorite, status, page, page_size` (mặc định 20) | Phân trang `WordWithState`                                          |
| GET    | `/words/:id`          |                                                                    | `WordWithState`                                                     |
| GET    | `/topics`             |                                                                    | `Topic[]`                                                           |
| PUT    | `/words/:id/favorite` | `{ is_favorite }`                                                  | `WordWithState`                                                     |
| PUT    | `/words/:id/note`     | `{ note }`                                                         | `WordWithState`                                                     |

### Ôn tập (SRS)

| Method | Đường dẫn          | Body / Query          | Trả về                              |
| ------ | ------------------ | --------------------- | ----------------------------------- |
| GET    | `/reviews/due`     | `limit` (mặc định 50) | `{ items: WordWithState[], total }` |
| POST   | `/reviews/:wordId` | `{ quality: 0–5 }`    | `{ word: WordWithState }`           |

### Quiz

| Method | Đường dẫn      | Body / Query                                                 | Trả về                                   |
| ------ | -------------- | ------------------------------------------------------------ | ---------------------------------------- |
| POST   | `/quiz/start`  | `{ mode: 'jp_vi' \| 'vi_jp', level, count: 10 \| 20 \| 30 }` | `{ quiz_id, questions: QuizQuestion[] }` |
| POST   | `/quiz/submit` | `{ quiz_id, answers: [{ question_id, option_id }] }`         | `QuizResult`                             |

```ts
interface QuizQuestion {
  id: string;
  word_id: string;
  prompt: string; // jp_vi: kanji hoặc kana; vi_jp: nghĩa tiếng Việt
  prompt_sub: string | null; // jp_vi: cách đọc, hiện sau khi trả lời
  options: { id: string; text: string }[]; // đúng 4 đáp án
  correct_option_id: string; // gửi kèm để phản hồi tức thì
}

interface QuizResult {
  total: number;
  correct: number;
  score_percent: number;
  wrong: { question_id: string; word: Word; chosen_text: string; correct_text: string }[];
}
```

### Thống kê

| Method | Đường dẫn         | Body / Query            | Trả về                                                                                                        |
| ------ | ----------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| GET    | `/stats/overview` |                         | `{ streak_days, longest_streak, total_learned, mastered, due_today, today: { new_learned, reviewed, goal } }` |
| GET    | `/stats/weekly`   | `weeks` (mặc định 8)    | `{ weeks: [{ week_start, new_learned, reviewed }] }`                                                          |
| GET    | `/stats/calendar` | `from, to` (YYYY-MM-DD) | `{ days: [{ date, count }] }`                                                                                 |

### Tài khoản

| Method | Đường dẫn      | Body / Query                         | Trả về                                        |
| ------ | -------------- | ------------------------------------ | --------------------------------------------- |
| PUT    | `/me/settings` | `Partial<UserSettings>`              | `{ user: User }`                              |
| PUT    | `/me/profile`  | `{ display_name }`                   | `{ user: User }`                              |
| PUT    | `/me/password` | `{ current_password, new_password }` | 204                                           |
| GET    | `/me/export` ⏸ |                                      | JSON gồm user, trạng thái từng từ, lịch sử ôn |
| DELETE | `/me`          | `{ password }`                       | 204                                           |

### Quản trị (chỉ `role: admin`, ngược lại 403)

| Method | Đường dẫn             | Body / Query                                                     | Trả về                                                              |
| ------ | --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/admin/words`        | `q, level, topic, page, page_size`                               | Phân trang `Word`                                                   |
| POST   | `/admin/words`        | `Word` không có id                                               | 201 `Word`                                                          |
| PUT    | `/admin/words/:id`    | `Word` không có id                                               | `Word`                                                              |
| DELETE | `/admin/words/:id`    |                                                                  | 204                                                                 |
| POST   | `/admin/words/import` ⏸ | `{ format: 'csv' \| 'json', content: string, dry_run: boolean }` | `{ valid_count, created_count, errors: [{ row, field, message }] }` |
| GET    | `/admin/words/export` ⏸ | `format=csv\|json`                                               | File tải về                                                         |

Import với `dry_run: true` chỉ kiểm tra, không ghi. Giao diện gọi dry run trước để xem trước, rồi mới gọi thật.

> ⏸ **Tạm hoãn (22/10/2026):** ba endpoint xuất/nhập (`/me/export`, `/admin/words/import`, `/admin/words/export`) đã được gỡ khỏi frontend và mock. Giữ đặc tả ở đây (kèm phụ lục G, H) để làm lại sau; backend chưa cần làm.

---

## Phụ lục: chi tiết đã chốt khi làm frontend

Những điểm hợp đồng gốc chưa nói rõ. Mock (`src/mock/handlers/`) đã làm đúng như dưới đây; backend nên làm giống.

### A. Phần mở rộng so với hợp đồng gốc

1. **`GET /reviews/due` trả thêm `next_due_at: string | null`**: `due_at` sớm nhất của các thẻ chưa đến hạn hôm nay. Trang Ôn tập cần trường này cho trạng thái rỗng ("Lần ôn tiếp theo: thứ Sáu"), vì hợp đồng gốc không có cách nào khác để biết.
2. **`GET /admin/words` nhận thêm `sort` và `order`**, để bảng Quản trị sắp xếp theo cột trên toàn bộ dữ liệu, không chỉ trong trang hiện tại.
   - `sort` ∈ `id | kanji | kana | romaji | level | type | topic_id`, mặc định `id`.
   - `order` ∈ `asc | desc`, mặc định `asc`.
   - Giá trị không hợp lệ thì dùng mặc định.
3. **`GET /health`** trả `{ ok: true }`, không cần đăng nhập. Thêm theo prompt backend (mục 3.1) để kiểm tra khi deploy. Frontend không gọi endpoint này.

### B. Quy ước chung

- Tham số boolean trên query (`favorite`) gửi dưới dạng `true`. Server chấp nhận cả `true` và `1`.
- `page` bắt đầu từ 1. `page_size` tối đa 100. Giá trị không hợp lệ thì dùng mặc định.
- Email được trim và chuyển về chữ thường trước khi lưu và so sánh.
- Sai mật khẩu hiện tại ở `PUT /me/password` và `DELETE /me` trả **400 `VALIDATION_ERROR`** với `fields.current_password` hoặc `fields.password`, **không trả 401**. Lý do: client hiểu 401 ở các endpoint này là phiên hết hạn và sẽ đăng xuất người dùng.
- Validate theo các schema zod ở `src/schemas/`: tên hiển thị 2–40 ký tự, mật khẩu tối thiểu 6 ký tự, ghi chú tối đa 500 ký tự.
- `POST /auth/register` đăng nhập luôn (đặt cookie phiên). Cài đặt mặc định của tài khoản mới: `{ daily_goal: 10, level: 'N5', theme: 'system' }`.

### C. Từ vựng

- `GET /words`:
  - Sắp xếp theo cấp độ (N5, N4, N3), rồi `topic_id`, rồi `id`.
  - `q` tìm trong kanji, kana, romaji và mọi nghĩa tiếng Việt. Không phân biệt hoa thường và dấu tiếng Việt (xem `src/utils/normalize.ts`).
- `GET /words/today`:
  - `date` là ngày hiện tại dạng YYYY-MM-DD.
  - Danh sách được chốt cho cả ngày. Chỉ tính lại khi người dùng đổi `daily_goal` hoặc `level` giữa ngày; khi đó các từ đã học hôm nay được giữ lại, rồi bổ sung cho đủ mục tiêu.
  - `new_words` gồm cả từ đã học hôm nay, với trạng thái mới, để giao diện đánh dấu "đã học".
  - `learned_today` là số từ được chấm lần đầu trong hôm nay.
- `DELETE /admin/words/:id` xóa luôn trạng thái của từ đó ở mọi người dùng.

### D. Ôn tập

- `quality` là số nguyên 0–5; ngoài khoảng này trả 400. Giao diện chỉ gửi 1, 3, 4, 5.
- Mỗi lần chấm được ghi vào lịch sử với `was_new = true` nếu trước đó từ có `status = new`.

### E. Quiz

- `prompt_sub` ở chế độ `jp_vi`:
  - Từ có kanji: `"<kana> · <romaji>"`.
  - Từ không có kanji: `"<romaji>"`.
  - Ở chế độ `vi_jp`, `prompt_sub` luôn là `null`.
- Nội dung đáp án:
  - `jp_vi`: nghĩa chính.
  - `vi_jp`: `"<kanji>（<kana>）"`, hoặc chỉ kana nếu từ không có kanji.
- Cấp độ có ít hơn 4 từ thì trả 400, với `fields.level`. Cấp độ có ít từ hơn `count` thì quiz có ít câu hơn.
- `POST /quiz/submit`: câu không có trong `answers` được tính là sai, với `chosen_text = ""`. Quiz của người khác hoặc không tồn tại thì trả 404.
- Bộ câu hỏi lưu ở server và hết hạn sau 2 giờ kể từ `POST /quiz/start`. Server chấm lại bằng bộ câu đã lưu, không tin kết quả client tự tính.
- Mỗi bài chỉ nộp được một lần (theo prompt backend, mục 3.2). Lỗi đều là 400 `VALIDATION_ERROR` ở trường `quiz_id`:
  - Bài đã nộp: `"Bài quiz này đã được nộp. Làm bài mới nhé."`
  - Bài hết hạn: `"Bài quiz đã hết hạn. Làm bài mới nhé."`

### F. Thống kê

- `week_start` là thứ Hai đầu tuần. Danh sách tuần tăng dần và kết thúc ở tuần hiện tại.
- Phân loại lượt chấm cho `new_learned` và `reviewed`:
  - `new_learned` là số lượt chấm có `was_new = true`.
  - `reviewed` là số lượt chấm còn lại, kể cả lượt chấm lại một thẻ vừa "Quên" trong cùng phiên.
- `/stats/calendar`:
  - `from` và `to` là bắt buộc, tính cả hai đầu, cách nhau tối đa 400 ngày. Sai định dạng thì trả 400.
  - Chỉ trả những ngày có `count > 0`. `count` là tổng số lượt chấm trong ngày.
- `today.new_learned` đếm số từ khác nhau, không đếm số lượt.

### G. Xuất dữ liệu ⏸ (tạm hoãn)

`GET /me/export` trả về:

```ts
{
  exported_at: string;
  user: User;
  words: (UserWordState & { word_id: string; kanji: string | null; kana: string })[]; // chỉ từ đã có tương tác
  reviews: { word_id: string; quality: number; reviewed_at: string; was_new: boolean }[];
}
```

### H. Import và export từ vựng ⏸ (tạm hoãn)

- CSV dùng UTF-8, dòng đầu là tên cột.
- Các cột: `kanji, kana, romaji, meanings_vi, type, level, topic_id, example_jp, example_kana, example_romaji, example_vi`.
  - `meanings_vi` ngăn cách bằng `|`.
  - Ô `kanji` để trống nghĩa là `null`.
  - Cột `id` nếu có thì bị bỏ qua.
- File export CSV:
  - Có cột `id` đứng đầu.
  - Có BOM UTF-8, để Excel nhận đúng mã hóa.
  - Tên file `tu-vung-YYYY-MM-DD.csv` hoặc `.json`, gửi qua header `Content-Disposition: attachment`.
- JSON import là một mảng các object `Word` không có id.
- Số dòng `row` trong lỗi import:
  - `row = 1` là dòng dữ liệu đầu tiên: với CSV là dòng ngay sau tiêu đề, với JSON là phần tử đầu tiên của mảng.
  - Lỗi cấu trúc file (thiếu cột, JSON hỏng, file trống) có `row = 0` và `field = "content"`.
- Mỗi dòng có thể có nhiều lỗi, mỗi trường một lỗi.
- Từ trùng cặp `kanji` + `kana` với dữ liệu sẵn có, hoặc với dòng trước trong cùng file, bị báo lỗi ở `field = "kana"`.
- Nhập thật (`dry_run: false`) ghi các dòng hợp lệ và bỏ qua dòng lỗi. Khi đó `created_count = valid_count`.

### I. Chỉ ở chế độ mock

- `?mockError=1` trên URL trang làm mọi request trả 500, **trừ `/api/auth/*`**, để vẫn đăng nhập được khi kiểm tra giao diện lỗi.
- Không có độ trễ giả lập khi chạy test.
- Khóa localStorage: `jpvocab:mock-db` (toàn bộ dữ liệu) và `jpvocab:mock-session` (id người dùng đang đăng nhập).
