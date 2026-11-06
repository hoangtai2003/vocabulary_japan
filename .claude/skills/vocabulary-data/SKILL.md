---
name: vocabulary-data
description: Thêm, sửa hoặc kiểm tra từ vựng và chủ đề trong dữ liệu gốc của jpvocab (prisma/seed-data/words.json, topics.json), rồi đồng bộ sang bản sao test của frontend và seed vào DB.
---

# Dữ liệu từ vựng gốc

- Nguồn duy nhất: `vocabulary_japan_be/prisma/seed-data/words.json` và `topics.json`.
- Bản sao chỉ để test: `vocabulary_japan_fe/src/test/mock/data/` (phải giống hệt nguồn).
- Từ thêm/sửa trên trang Quản trị nằm trong DB, không nằm trong file gốc. Hai đường này độc lập.

## Hình dạng một từ

Xem kiểu `Word` ở `vocabulary_japan_fe/src/types/word.ts` và schema `wordInputSchema` ở `vocabulary_japan_fe/src/schemas/word.ts`. Lấy một từ có sẵn trong `words.json` làm mẫu.

- `id` không đổi sau khi đã có (seed khớp theo id; đổi id tạo ra từ trùng).
- `kanji` là `null` với từ chỉ viết kana.
- `meanings_vi` là mảng, nghĩa chính đứng đầu (quiz dùng nghĩa chính).
- `topic_id` phải có trong `topics.json`.
- Không trùng bộ `(kanji, kana, level)` với từ khác.
- Câu ví dụ đủ bốn trường: tiếng Nhật, kana, romaji, tiếng Việt.

## Quy trình

1. Sửa file trong `vocabulary_japan_be/prisma/seed-data/`.
2. Chép sang frontend và chạy test kiểm tra dữ liệu:
   ```bash
   cp vocabulary_japan_be/prisma/seed-data/{words,topics}.json vocabulary_japan_fe/src/test/mock/data/
   cd vocabulary_japan_fe && npm test -- words
   ```
   Test của FE dựa vào số lượng và nội dung từ mẫu; nếu test trang hỏng vì đổi dữ liệu, sửa test cho đúng dữ liệu mới, không sửa dữ liệu cho vừa test.
3. Chạy test backend (`npm test` trong `vocabulary_japan_be`).
4. `npm run db:seed` ở máy dev. Seed chỉ **thêm** từ còn thiếu theo id, không ghi đè. Muốn áp dụng lại toàn bộ ở máy dev: `npm run db:reset` (xóa sạch DB dev).
5. Production: sau khi deploy, chạy seed theo skill `deploy`.
6. Cập nhật số từ trong `vocabulary_japan_be/PROJECT_STRUCTURE.md` nếu đổi.
