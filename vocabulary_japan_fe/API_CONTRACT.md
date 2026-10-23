# Hợp đồng API – App học từ vựng tiếng Nhật

Chép nguyên từ mục 4 của prompt frontend. Đây là nguồn sự thật duy nhất cho cả frontend và backend.
Kiểu dữ liệu (`User`, `Word`, `WordWithState`, …) xem mục 3 của prompt, bản TypeScript ở `src/types/`.
Các chi tiết đã chốt khi làm frontend nằm ở **Phụ lục** cuối file.

## 4.1 Biến môi trường

| Biến            | Giá trị                                          | Mặc định               |
| --------------- | ------------------------------------------------ | ---------------------- |
| `VITE_API_URL`  | URL gốc backend, ví dụ `https://api.example.com` | rỗng (gọi cùng domain) |

## 4.2 Client và cách tổ chức

- Một client duy nhất ở `src/api/client.ts`: fetch wrapper, tiền tố `/api`, `credentials: "include"`, header JSON, timeout 15 giây.
- Response lỗi luôn có dạng `{ error: { code, message, fields? } }`. Client ném `ApiError` có `status`, `code`, `message`, `fields`.
- Khi nhận 401 ở bất kỳ request nào trừ `/auth/login` và `/auth/me`: xóa cache người dùng và chuyển về `/dang-nhap?next=<trang hiện tại>`.
- Các module: `authApi`, `wordsApi`, `reviewApi`, `quizApi`, `statsApi`, `meApi`, `adminApi`, và cho module luyện đề (SRS 2.0) `examsApi`, `examAdminApi`. Mỗi hàm có kiểu tham số và kiểu trả về.
- Custom hook bọc TanStack Query ở `src/hooks/queries/`. Component không bao giờ gọi fetch hay module API trực tiếp.
- Query keys tập trung ở `src/api/queryKeys.ts`. Sau khi chấm điểm một thẻ, invalidate `reviews.due`, `words.today` và `stats.*`. Thao tác yêu thích và ghi chú dùng optimistic update.

## 4.3 API giả lập cho test

App chạy thật luôn gọi backend. API giả lập chỉ còn dùng trong test:

- MSW v2 (node): `src/test/mock/handlers/*.ts`, bật trong `src/test/setup.ts`. Test đi qua cùng client với app thật.
- Dữ liệu giả lưu trong localStorage (khóa tiền tố `jpvocab:`), xóa sau mỗi test.
- Phiên đăng nhập giả: lưu id người dùng hiện tại trong localStorage, mật khẩu băm SHA-256 bằng Web Crypto.
- SRS chạy trong handler giả lập bằng cùng hàm ở `src/utils/srs.ts` (mục 5).

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

Mã lỗi của module luyện đề (SRS 2.0, mục 5.2). Các lỗi này có thể kèm `details` (object) trong `error`:

| HTTP | code                  | Khi nào                                                                          |
| ---- | --------------------- | -------------------------------------------------------------------------------- |
| 409  | `ATTEMPT_SUBMITTED`   | Lưu câu trả lời, bắt đầu hoặc nộp một phần đã nộp                                |
| 409  | `SECTION_TIME_UP`     | Lưu câu trả lời sau hạn nộp của phần (phần được nộp tự động)                      |
| 409  | `ATTEMPT_IN_PROGRESS` | Bắt đầu lượt mới khi còn lượt dở mà chưa xác nhận bỏ. `details: { attempt_id }`  |
| 409  | `EXAM_HAS_ATTEMPTS`   | Xóa đề đã có lượt làm                                                            |
| 409  | `CONFIRM_REGRADE`     | Đổi đáp án đúng của câu đã có bài được chấm mà chưa gửi `confirm_regrade: true`. `details: { attempt_count }` |
| 422  | `EXAM_INVALID`        | Xuất bản hoặc nhập đề còn lỗi. `details: { errors: ExamIssue[], warnings: ExamIssue[] }` |

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

> ⏸ **Tạm hoãn (22/10/2026):** ba endpoint xuất/nhập (`/me/export`, `/admin/words/import`, `/admin/words/export`) đã được gỡ khỏi frontend và mock. Prompt backend cũng đã bỏ `/me/export`, nên backend không cài đặt ba endpoint này. Giữ đặc tả ở đây (kèm phụ lục G, H) để làm lại sau.

### Luyện đề JLPT (SRS 2.0)

Kiểu dữ liệu ở phụ lục J; bản TypeScript ở `src/types/exam.ts`. Mọi endpoint cần đăng nhập. Lượt làm của người khác trả 404.

| Method | Đường dẫn                                    | Body / Query                                                     | Trả về                                   |
| ------ | -------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------- |
| GET    | `/exams`                                     | `level`                                                          | `ExamListItem[]`                         |
| GET    | `/exams/:id`                                 |                                                                  | `ExamDetail`                             |
| GET    | `/exams/:id/attempts`                        |                                                                  | `AttemptSummary[]`                       |
| POST   | `/exams/:id/attempts`                        | `{ mode, scope, discard_in_progress? }`                          | 201 `{ attempt_id }`                     |
| GET    | `/attempts/:id`                              |                                                                  | `AttemptState`                           |
| PUT    | `/attempts/:id/position`                     | `{ question_id }`                                                | 204                                      |
| POST   | `/attempts/:id/sections/:sectionId/start`    |                                                                  | `AttemptState`                           |
| PUT    | `/attempts/:id/answers/:questionId`          | `{ choice?, flagged?, time_spent_ms?, changed_at? }`             | `{ answer: SavedAnswer, feedback: Feedback \| null }` |
| POST   | `/attempts/:id/sections/:sectionId/submit`   |                                                                  | `{ attempt_status, next_section_id }`    |
| POST   | `/attempts/:id/finish`                       |                                                                  | `{ attempt_status: 'submitted' }`        |
| GET    | `/attempts/:id/result`                       |                                                                  | `AttemptResult`                          |
| GET    | `/practice/mondai-types`                     | `level`                                                          | `PracticeType[]`                         |
| GET    | `/practice/wrong-questions`                  |                                                                  | `{ total, items: WrongQuestionItem[] }`  |
| POST   | `/practice/wrong-questions`                  | `{ level?, limit? }` (mặc định 20, tối đa 50)                    | 201 `{ attempt_id }`                     |
| POST   | `/practice/by-type`                          | `{ level, mondai_type, count }` (1–50, mặc định 10)              | 201 `{ attempt_id }`                     |
| GET    | `/stats/exams`                               |                                                                  | `ExamStats`                              |
| POST   | `/reviews/from-explanation`                  | `{ word_id }`                                                    | `{ word: WordWithState, already_in_reviews }` |
| GET    | `/uploads/:id`                               |                                                                  | Ảnh của bài đọc (PNG, JPEG, WebP, GIF)   |

### Quản trị đề thi (chỉ `role: admin`, ngược lại 403)

| Method | Đường dẫn                           | Body / Query                                  | Trả về                                         |
| ------ | ----------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| GET    | `/admin/exams`                      | `level, status`                               | `AdminExamListItem[]`                          |
| POST   | `/admin/exams`                      | `ExamInfoInput`                               | 201 `AdminExam`                                |
| GET    | `/admin/exams/:id`                  |                                               | `AdminExam`                                    |
| PUT    | `/admin/exams/:id`                  | `Partial<ExamInfoInput>`                      | `AdminExam`                                    |
| DELETE | `/admin/exams/:id`                  |                                               | 204                                            |
| POST   | `/admin/exams/:id/duplicate`        |                                               | 201 `AdminExam`                                |
| POST   | `/admin/exams/:id/validate`         |                                               | `ValidationResult`                             |
| PUT    | `/admin/exams/:id/status`           | `{ status }`                                  | `AdminExam`                                    |
| PUT    | `/admin/exams/:id/order`            | `{ sections: [{ id, mondai: [{ id, passages: id[], questions: id[] }] }] }` | `AdminExam`      |
| GET    | `/admin/exams/:id/export`           |                                               | File JSON (định dạng nhập đề)                  |
| POST   | `/admin/exams/import`               | `{ content: string, dry_run: boolean }`       | `ImportDryRun` hoặc 201 `{ exam: AdminExam, warnings }` |
| GET    | `/admin/exams/import-template`      |                                               | File JSON mẫu (đề mẫu số 11)                   |
| POST   | `/admin/sections`                   | `{ exam_id, title, kind?, duration_minutes?, score_group? }` | 201 `AdminExam`                 |
| PUT    | `/admin/sections/:id`               | `Partial<…>`                                  | `AdminSection` không có `mondai`               |
| DELETE | `/admin/sections/:id`               |                                               | `AdminExam`                                    |
| POST   | `/admin/mondai`                     | `{ section_id, type_id?, number?, instructions?, tip? }` | 201 `AdminExam`                     |
| PUT    | `/admin/mondai/:id`                 | `Partial<…>`                                  | `AdminMondai` không có `passages`, `questions` |
| DELETE | `/admin/mondai/:id`                 |                                               | `AdminExam`                                    |
| POST   | `/admin/passages`                   | `{ mondai_id, …AdminPassage }`                | 201 `AdminExam`                                |
| PUT    | `/admin/passages/:id`               | `Partial<…>`                                  | `AdminPassage`                                 |
| DELETE | `/admin/passages/:id`               |                                               | `AdminExam`                                    |
| POST   | `/admin/questions`                  | `{ mondai_id, kind?, passage_id?, …AdminQuestion }` | 201 `AdminExam`                          |
| PUT    | `/admin/questions/:id`              | `Partial<…> & { confirm_regrade? }`           | `AdminQuestion`                                |
| DELETE | `/admin/questions/:id`              |                                               | `AdminExam`                                    |
| GET    | `/admin/questions/:id/history`      |                                               | `QuestionEdit[]`                               |
| POST   | `/admin/uploads`                    | Ảnh thô, header `Content-Type: image/*` (≤ 2 MB) | 201 `{ id, content_type, size, markup }`    |
| GET    | `/admin/mondai-types`               |                                               | `MondaiType[]`                                 |
| POST   | `/admin/mondai-types`               | `MondaiType`                                  | 201 `MondaiType`                               |
| PUT    | `/admin/mondai-types/:id`           | `Partial<MondaiType>` không có `id`           | `MondaiType`                                   |

Thêm và xóa đổi cấu trúc (số câu, thứ tự) nên trả trọn cây đề; sửa (tự lưu từng phần) chỉ trả phần vừa sửa. Định dạng file nhập đề: `vocabulary_japan_be/EXAM_IMPORT_FORMAT.md`.

---

## Phụ lục: chi tiết đã chốt khi làm frontend

Những điểm hợp đồng gốc chưa nói rõ. Mock (`src/test/mock/handlers/`) đã làm đúng như dưới đây; backend nên làm giống.

### A. Phần mở rộng so với hợp đồng gốc

1. **`GET /reviews/due` trả thêm `next_due_at: string | null`**: `due_at` sớm nhất của các thẻ chưa đến hạn hôm nay. Trang Ôn tập cần trường này cho trạng thái rỗng ("Lần ôn tiếp theo: thứ Sáu"), vì hợp đồng gốc không có cách nào khác để biết.
2. **`GET /admin/words` nhận thêm `sort` và `order`**, để bảng Quản trị sắp xếp theo cột trên toàn bộ dữ liệu, không chỉ trong trang hiện tại.
   - `sort` ∈ `id | kanji | kana | romaji | level | type | topic_id`, mặc định `id`.
   - `order` ∈ `asc | desc`, mặc định `asc`.
   - `level` sắp theo thứ tự N5 → N4 → N3 (dễ → khó), không theo chuỗi. Từ không có kanji đứng đầu khi sắp `kanji` tăng dần.
   - Cùng giá trị thì sắp tiếp theo `id`, cùng chiều.
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
- `POST` và `PUT /admin/words`:
  - `topic_id` không tồn tại → 400 `VALIDATION_ERROR`, `fields.topic_id = "Chủ đề không tồn tại"`.
  - Trùng `(kanji, kana, level)` với một từ khác (hai kanji rỗng coi là bằng nhau) → 400 `VALIDATION_ERROR`, `fields.kana = "Từ này đã có trong dữ liệu"`. Sửa một từ mà giữ nguyên nội dung thì không tính là trùng với chính nó.

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
  - `from` và `to` là bắt buộc, tính cả hai đầu, tối đa 366 ngày (theo prompt backend, mục 5.4). Sai định dạng, ngày không có thật hoặc `from` sau `to` thì trả 400.
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

### J. Luyện đề JLPT (SRS 2.0)

Cú pháp đánh dấu trong mọi nội dung đề (DR-EX-08): furigana `{漢字|かんじ}`, phần được hỏi `【…】`, chữ đậm `**…**`, chỗ trống `（　）`, chỗ trống đánh số `[[18]]`, bảng Markdown, ảnh `![mô tả](upload:<id>)` trên một dòng riêng. Bộ phân tích dùng chung: backend `src/domain/markup.ts`, frontend `src/utils/markup.ts`.

**Luật chính**

- Người học chỉ thấy đề `published`. Đề `hidden` vẫn xem lại được kết quả các lượt cũ.
- `mode`: `exam` (thi thử trọn đề, `scope.type = 'exam'`), `section` (luyện một phần có bấm giờ, `scope.type = 'section'`), `practice` (không giới hạn giờ, `scope.type` là `exam`, `section` hoặc `mondai`). Lượt `wrong_review` và `by_type` tạo qua `/practice/*`, không thuộc một đề (`exam = null`).
- Chế độ có bấm giờ: mỗi phần bắt đầu bằng `POST …/start`; server ghi `deadline_at`. Phần chưa bắt đầu hoặc đã nộp có `mondai: null` (không gửi câu hỏi). Phần sau chỉ bắt đầu được khi phần trước đã nộp. Hết hạn thì server tự nộp phần đó ở request kế tiếp, với `submitted_at = deadline_at`. Đồng hồ trên trình duyệt tính theo `deadline_at` và độ lệch `server_now`.
- Trước khi phần được nộp, không response nào của người học chứa `correct_option`, `star_order`, `explanation`, `learner_note` (trừ chế độ không giới hạn giờ).
- Chế độ không giới hạn giờ: lựa chọn đầu tiên của một câu được chấm ngay, `PUT …/answers` trả `feedback`; câu đã chấm không đổi lựa chọn nữa. Kết thúc bằng `POST /attempts/:id/finish`.
- `PUT …/answers`: trường nào không gửi thì giữ nguyên. `time_spent_ms` là tổng thời gian ở câu, server giữ giá trị lớn nhất. Bản gửi có `changed_at` cũ hơn bản đã lưu thì không ghi đè lựa chọn và cờ.
- Điểm ước tính (`score`) chỉ có khi `scope_type = 'exam'` và cấp N4, N5: `round(đúng ÷ tổng × 120)`, điểm liệt 38, tổng cần đỗ 90 (N4) hoặc 80 (N5), `listening_needed = max(19, tổng cần đỗ − điểm)`; `null` nếu chưa qua điểm liệt hoặc cần hơn 60.
- Danh sách câu sai: câu trả lời sai (khi nộp phần có bấm giờ, hoặc khi trả lời ở chế độ luyện) vào danh sách; câu trong danh sách làm đúng 2 lần liên tiếp thì rời danh sách. Câu không trả lời không tính.
- Sửa đáp án đúng của câu đã có bài được chấm: lần đầu trả 409 `CONFIRM_REGRADE`; gửi lại kèm `confirm_regrade: true` thì lưu và chấm lại nền; các lượt bị ảnh hưởng có `regraded_at`.

**Kiểu dữ liệu**

```ts
type ExamStatus = 'draft' | 'pending_review' | 'published' | 'hidden';
type AnswerKind = 'choice' | 'star';
type AttemptMode = 'exam' | 'section' | 'practice' | 'wrong_review' | 'by_type';
type ScopeType = 'exam' | 'section' | 'mondai' | 'wrong' | 'by_type';

interface Explanation {
  answer: string; full_sentence: string; translation_vi: string; why_correct: string; why_wrong: string;
  grammar: { pattern: string; explanation: string; examples: string[] }[];
  vocab: { word: string; reading: string; meaning: string; word_id: string | null }[];
}
interface Attachment { kind: 'image' | 'audio'; upload_id: string; caption: string }

// ----- Người học -----
interface ExamListItem {
  id: string; title: string; level: JlptLevel; difficulty: string | null; description: string;
  question_count: number; total_minutes: number;
  best: { attempt_id: string; correct: number; total: number; estimated_score: number | null; submitted_at: string } | null;
  in_progress_attempt_id: string | null;
}
interface ExamDetail {
  id: string; title: string; level: JlptLevel; difficulty: string | null; description: string; instructions: string;
  question_count: number; total_minutes: number;
  sections: { id: string; title: string; kind: 'reading' | 'listening'; duration_minutes: number | null; question_count: number;
    mondai: { id: string; number: number; type_id: string | null; type_label_ja: string | null; type_name_vi: string | null; question_count: number }[] }[];
  in_progress: { attempt_id: string; mode: AttemptMode; scope_type: ScopeType; scope_id: string | null; started_at: string } | null;
}
interface AttemptSummary {
  id: string; mode: AttemptMode; status: 'in_progress' | 'submitted'; scope_type: ScopeType; scope_id: string | null; scope_label: string;
  started_at: string; submitted_at: string | null; correct: number | null; total: number; estimated_score: number | null; regraded: boolean;
}
interface LearnerQuestion {
  id: string; number: number; kind: AnswerKind; prompt: string; options: string[];
  star_prefix: string; star_suffix: string; star_position: number | null; passage_id: string | null; attachments: Attachment[];
}
interface AttemptState {
  id: string; mode: AttemptMode; timed: boolean; status: 'in_progress' | 'submitted' | 'abandoned';
  scope_type: ScopeType; scope_id: string | null; scope_label: string; level: JlptLevel;
  exam: { id: string; title: string; level: JlptLevel } | null;
  started_at: string; submitted_at: string | null; server_now: string; current_question_id: string | null;
  sections: {
    id: string; exam_id: string; exam_title: string; title: string; position: number; duration_minutes: number | null;
    started_at: string | null; deadline_at: string | null; submitted_at: string | null; question_count: number;
    mondai: {
      id: string; number: number; type_id: string | null; type_label_ja: string | null; type_name_vi: string | null;
      instructions: string; tip: string | null; // tip chỉ ở chế độ không giới hạn giờ
      passages: { id: string; label: string; intro: string; content: string; attachments: Attachment[];
        content_furigana: string | null; translation_vi: string | null }[]; // null ở chế độ có bấm giờ
      questions: LearnerQuestion[];
    }[] | null;
  }[];
  answers: SavedAnswer[];
  feedback: Feedback[]; // chỉ chế độ không giới hạn giờ
}
interface SavedAnswer { question_id: string; choice: number | null; flagged: boolean; time_spent_ms: number }
interface Solution {
  correct_option: number | null; star_order: number[]; learner_note: string;
  explanation: Explanation & { vocab: (Explanation['vocab'][number] & { in_reviews: boolean })[] };
}
interface Feedback extends Solution { question_id: string; is_correct: boolean }
interface ScoreSummary {
  group: string; estimated_score: number; max_score: 120; sectional_min: 38; meets_sectional_min: boolean;
  pass_total: number; listening_needed: number | null;
}
interface AttemptResult {
  id: string; mode: AttemptMode; timed: boolean; scope_type: ScopeType; scope_id: string | null; level: JlptLevel;
  exam: { id: string; title: string; level: JlptLevel } | null;
  started_at: string; submitted_at: string; regraded_at: string | null;
  correct: number; total: number; score: ScoreSummary | null;
  sections: {
    id: string; exam_id: string; exam_title: string; title: string; duration_minutes: number | null; time_used_seconds: number | null;
    correct: number; total: number;
    mondai: {
      id: string; number: number; type_id: string | null; type_label_ja: string | null; type_name_vi: string | null;
      instructions: string; tip: string; correct: number; total: number;
      passages: { id: string; label: string; intro: string; content: string; content_furigana: string; translation_vi: string; attachments: Attachment[] }[];
      questions: (LearnerQuestion & Solution & { chosen: number | null; is_correct: boolean; flagged: boolean; time_spent_ms: number })[];
    }[];
  }[];
}
/** Dạng mondai có câu trong đề đã xuất bản (chọn khi luyện theo dạng). */
interface PracticeType {
  id: string; level: JlptLevel; section_title: string; label_ja: string; name_vi: string; has_passage: boolean; question_count: number;
}
interface WrongQuestionItem {
  question_id: string; exam_id: string; exam_title: string; level: JlptLevel; section_title: string; mondai_number: number;
  type_id: string | null; type_name_vi: string | null; number: number | null; prompt_preview: string;
  correct_streak: number; last_wrong_at: string;
}
interface ExamStats {
  attempts: { attempt_id: string; exam_id: string | null; exam_title: string; level: JlptLevel; submitted_at: string;
    correct: number; total: number; estimated_score: number | null }[]; // thi thử trọn đề, cũ → mới
  by_type: { type_id: string; level: JlptLevel | null; label_ja: string; name_vi: string; answered: number; correct: number;
    accuracy: number; avg_time_ms: number | null; standard_time_ms: number | null }[]; // accuracy tăng dần
}

// ----- Quản trị -----
interface ExamInfo {
  id: string; title: string; level: JlptLevel; difficulty: string | null; description: string; instructions: string;
  source: string; status: ExamStatus; published_at: string | null; created_at: string; updated_at: string;
}
type ExamInfoInput = Pick<ExamInfo, 'title' | 'level' | 'difficulty' | 'description' | 'instructions' | 'source'>;
interface AdminExamListItem extends ExamInfo { question_count: number; flagged_count: number; attempt_count: number }
interface AdminExam extends ExamInfo { attempt_count: number; sections: AdminSection[] }
interface AdminSection { id: string; position: number; title: string; kind: 'reading' | 'listening'; duration_minutes: number | null; score_group: string; mondai: AdminMondai[] }
interface AdminMondai { id: string; position: number; number: number; type_id: string | null; instructions: string; tip: string; passages: AdminPassage[]; questions: AdminQuestion[] }
interface AdminPassage { id: string; position: number; label: string; intro: string; content: string; content_furigana: string; translation_vi: string; attachments: Attachment[] }
interface AdminQuestion {
  id: string; position: number; number: number; number_override: number | null; passage_id: string | null; kind: AnswerKind;
  prompt: string; options: string[]; correct_option: number | null;
  star_prefix: string; star_suffix: string; star_position: number | null; star_order: number[];
  explanation: Explanation; learner_note: string; needs_review: boolean; internal_note: string; attachments: Attachment[]; updated_at: string;
}
interface MondaiType {
  id: string; level: JlptLevel; section_title: string; label_ja: string; name_vi: string;
  answer_kind: AnswerKind; has_passage: boolean; default_instructions: string; sort_order: number;
}
interface ExamIssue {
  message: string;
  location: { section: number | null; section_title: string | null; mondai: number | null; question: number | null; field: string | null };
  path?: string | null; // chỉ ở lỗi nhập đề: vị trí trong file JSON
}
interface ValidationResult { errors: ExamIssue[]; warnings: ExamIssue[] }
interface ImportDryRun {
  valid: boolean; summary: { sections: number; mondai: number; passages: number; questions: number } | null;
  errors: ExamIssue[]; warnings: ExamIssue[]; preview: AdminExam | null; // id trong preview là id giả
}
interface QuestionEdit { id: string; edited_at: string; editor: { display_name: string; email: string } | null; fields: string[] }
```

- Chuyển trạng thái được phép: `draft → pending_review`, `pending_review → draft | published`, `published → hidden`, `hidden → published | draft`. Chuyển khác → 400 ở `fields.status`.
- `POST /admin/exams` tạo sẵn hai phần thi theo thời gian chuẩn của cấp (N5: 20 và 40 phút, N4: 25 và 55, N3: 30 và 70).
- Mục từ vựng của lời giải chưa có `word_id` mà kanji và cách đọc khớp một từ trong kho (hoặc từ chỉ có kana khớp kana) thì server tự gán khi lưu.

### I. Chỉ ở API giả lập (test)

- `?mockError=1` trên URL trang làm mọi request trả 500, **trừ `/api/auth/*`**, để vẫn đăng nhập được khi kiểm tra giao diện lỗi.
- Không có độ trễ giả lập khi chạy test.
- Khóa localStorage: `jpvocab:mock-db` (toàn bộ dữ liệu) và `jpvocab:mock-session` (id người dùng đang đăng nhập).
