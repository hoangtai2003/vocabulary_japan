---
name: exam-content
description: Soạn, chuyển đổi, kiểm tra hoặc sửa nội dung đề thi JLPT (file JSON nhập đề, cú pháp đánh dấu furigana/【】/[[n]], câu ★, lời giải 6 mục, dạng mondai) cho module luyện đề của jpvocab.
---

# Nội dung đề thi JLPT

Đặc tả đầy đủ: `vocabulary_japan_be/EXAM_IMPORT_FORMAT.md`. **Đọc file này trước khi soạn hoặc sửa đề.** Mẫu chuẩn: `vocabulary_japan_be/prisma/seed-data/exams/n4-de-luyen-11.json` (57 câu, lời giải đủ 6 mục).

## Điểm phải nhớ

- File JSON UTF-8, ≤ 5 MB, `"format_version": 1`. Cây: `exam` → `sections` → `mondai` → `passages`, `questions`.
- `exam.source` bắt buộc: ghi căn cứ quyền sử dụng đề. Không chép đề có bản quyền khi người dùng không xác nhận có quyền.
- Mỗi lần nhập tạo **một đề mới ở trạng thái Nháp**, không ghi đè. Tên trùng trong cùng cấp → lỗi.
- Thời gian chuẩn mỗi phần: N5 20 và 40 phút, N4 25 và 55, N3 30 và 70.
- Mondai phải có `type_id` đúng cấp và đúng kiểu câu (bảng dạng mondai N4 ở cuối EXAM_IMPORT_FORMAT.md).
- Câu `choice`: đúng 4 lựa chọn không trùng, giữ thứ tự đề gốc, `correct_option` 1–4.
- Câu `star`: `star_prefix`, `star_suffix`, 4 mảnh trong `options`, `star_position` 1–4, `star_order` đủ 4 mảnh; `correct_option` để `null`.
- Số câu đánh liên tục trong mỗi phần thi, từ 1; chỉ dùng `number_override` khi cần khớp đề gốc.
- Bài đọc có `key` duy nhất trong mondai; câu trỏ tới bằng `passage: "<key>"`.

## Cú pháp đánh dấu

`{漢字|かんじ}` furigana · `【…】` phần được hỏi · `**…**` đậm · `（　）` chỗ trống · `[[18]]` chỗ trống đánh số (trỏ câu 18 cùng phần thi) · bảng Markdown · `![mô tả](upload:<id>)` ảnh trên dòng riêng.

Khi chuyển từ bản chữa đề: `漢字（かんじ）` đổi thành `{漢字|かんじ}`.

## Lời giải 6 mục

`answer`, `full_sentence` (có furigana) + `translation_vi`, `why_correct`, `why_wrong`, `grammar[]`, `vocab[]`. `vocab[].word_id` để `null`, hệ thống tự gắn khi khớp kho từ. Câu ★ không cần ghi thứ tự đúng trong lời giải.

## Kiểm tra trước khi giao

1. Đối chiếu đáp án với bảng đáp án gốc, từng câu.
2. Câu có vấn đề nội dung: giữ nguyên như đề gốc, đặt `needs_review: true`, ghi `internal_note` (đề xuất sửa) và `learner_note` nếu người học cần biết. Để người dùng quyết định.
3. Nhập thử ở Quản trị → Đề thi → Nhập đề (dry run báo lỗi kèm vị trí), xem lại bằng màn hình Xem trước.
4. Luồng trạng thái: Nháp → Gửi duyệt → Xuất bản; muốn gỡ thì Ẩn.
