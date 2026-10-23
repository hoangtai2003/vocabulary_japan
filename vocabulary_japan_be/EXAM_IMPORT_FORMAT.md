# Định dạng file nhập đề thi (DR-EX-11)

File nhập đề là **một file JSON, UTF-8, tối đa 5 MB**, phản ánh đúng cây đề: đề → phần thi → mondai → bài đọc, câu hỏi. Nhập ở trang Quản trị → Đề thi → Nhập đề (`/quan-tri/de-thi/nhap`). File mẫu đầy đủ là đề luyện N4 số 11: `prisma/seed-data/exams/n4-de-luyen-11.json` (cũng tải được bằng nút "Tải file mẫu").

- Mỗi lần nhập tạo **một đề mới ở trạng thái Nháp**, không bao giờ ghi đè đề có sẵn. Tên đề trùng với một đề cùng cấp thì báo lỗi.
- File còn lỗi thì không nhập được. File hợp lệ được nhập trọn vẹn trong một lần.
- Cảnh báo (câu thiếu lời giải, bài đọc thiếu bản dịch, câu gắn cờ, đáp án dồn một vị trí) không chặn nhập.
- Sau khi nhập, mọi chỉnh sửa làm trên trình soạn. Xuất đề (`GET /admin/exams/:id/export`) ra đúng định dạng này.

## Cấu trúc

```jsonc
{
  "format_version": 1,
  "exam": {
    "title": "N4 · Đề luyện số 11",        // bắt buộc, ≤ 120 ký tự, không trùng trong cùng cấp
    "level": "N4",                         // N5 | N4 | N3
    "difficulty": "Nâng cao",              // tùy chọn (null)
    "description": "…",                    // tùy chọn
    "instructions": "…",                   // tùy chọn: hướng dẫn làm bài chung
    "source": "Tự soạn: …",                // bắt buộc: căn cứ quyền sử dụng đề (NFR-EX-11)
    "sections": [ /* Phần thi */ ]
  }
}
```

### Phần thi

| Trường             | Kiểu            | Ghi chú                                                                 |
| ------------------ | --------------- | ----------------------------------------------------------------------- |
| `title`            | string          | Ví dụ `言語知識（文字・語彙）`                                            |
| `kind`             | `reading`       | Mặc định `reading`. `listening` để dành cho phần Nghe sau này (DR-EX-12) |
| `duration_minutes` | số nguyên       | Bắt buộc khi xuất bản. Chuẩn N4: 25 và 55; N5: 20 và 40                 |
| `score_group`      | string          | N4, N5: `Kiến thức ngôn ngữ・Đọc hiểu`                                   |
| `mondai`           | mảng            | Theo thứ tự trong đề                                                    |

### Mondai

| Trường         | Kiểu      | Ghi chú                                                                       |
| -------------- | --------- | ----------------------------------------------------------------------------- |
| `number`       | số nguyên | Số hiệu `問題N` như đề gốc                                                     |
| `type_id`      | string    | Mã dạng mondai, xem bảng cuối file. Kiểu câu phải khớp kiểu của dạng            |
| `instructions` | string    | Câu hướng dẫn tiếng Nhật (có thể dùng cú pháp đánh dấu)                        |
| `tip`          | string    | Mẹo làm bài tiếng Việt, hiện ở đầu phần lời giải của mondai (tùy chọn)          |
| `passages`     | mảng      | Bài đọc của mondai (có thể rỗng)                                              |
| `questions`    | mảng      | Câu hỏi theo thứ tự                                                           |

### Bài đọc

| Trường             | Ghi chú                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| `key`              | Mã ngắn, duy nhất trong mondai (ví dụ `p1`). Câu hỏi tham chiếu bài đọc bằng key này |
| `label`            | Nhãn như `（1）` (tùy chọn)                                                        |
| `intro`            | Câu dẫn ngữ cảnh, ví dụ `林さんの 机の 上に、この メモが あります。`              |
| `content`          | Nội dung đúng như đề in (đoạn văn, bảng, ảnh)                                     |
| `content_furigana` | Bản đọc kèm furigana đầy đủ, hiện trong lời giải                                  |
| `translation_vi`   | Bản dịch tiếng Việt toàn bài                                                      |
| `attachments`      | Để trống `[]` (dành cho tệp âm thanh của phần Nghe sau này)                       |

### Câu hỏi

Trường chung:

| Trường            | Ghi chú                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| `kind`            | `choice` (chọn 1 trong 4) hoặc `star` (câu sắp xếp ★)                              |
| `passage`         | `key` của bài đọc trong cùng mondai, hoặc `null`                                   |
| `number_override` | `null` để tự đánh số. Số câu đánh liên tục trong mỗi phần thi, từ 1; ghi số ở đây khi cần khớp đề gốc (các câu sau đánh tiếp từ số này) |
| `explanation`     | Lời giải 6 mục, xem dưới                                                          |
| `learner_note`    | Ghi chú cho người học, hiện nổi bật trong lời giải (tùy chọn)                      |
| `needs_review`    | `true`: gắn cờ cần xem lại (chỉ quản trị viên thấy)                                |
| `internal_note`   | Ghi chú nội bộ, người học không thấy                                               |
| `attachments`     | `[]`                                                                              |

Câu `choice`:

- `prompt`: đề; phần được hỏi đặt trong `【 】`. Câu điền vào chỗ trống đánh số của bài đọc (như 問題3 phần 文法) để `""`.
- `options`: đúng 4 lựa chọn, không trùng nhau, giữ đúng thứ tự đề gốc.
- `correct_option`: 1–4.

Câu `star` (DR-EX-07):

- `star_prefix`, `star_suffix`: phần đầu và phần cuối câu, nằm ngoài 4 ô.
- `options`: 4 mảnh, không trùng nhau, đánh số 1–4 theo thứ tự in trong đề.
- `star_position`: ô có dấu ★ (1–4).
- `star_order`: thứ tự đúng của 4 mảnh, ví dụ `[3, 2, 4, 1]`.
- `correct_option`: để `null`. Đáp án được tính tự động là mảnh nằm ở ô ★ (`star_order[star_position - 1]`).

Ví dụ câu 14 của đề số 11 (`＿＿＿ ＿★＿ ＿＿＿ ＿＿＿ しまいました。`):

```json
{
  "kind": "star",
  "passage": null,
  "number_override": null,
  "prompt": "",
  "options": ["忘れて", "{頼|たの}まれた", "母に", "買い物を"],
  "correct_option": null,
  "star_prefix": "",
  "star_suffix": "しまいました。",
  "star_position": 2,
  "star_order": [3, 2, 4, 1]
}
```

### Lời giải (6 mục, DR-EX-09)

```jsonc
"explanation": {
  "answer": "2 こうじ",                                   // (1) đáp án
  "full_sentence": "{工事中|こうじちゅう}なので、…",         // (2) câu hoàn chỉnh có furigana
  "translation_vi": "Vì đang thi công nên …",              //     kèm bản dịch
  "why_correct": "…",                                     // (3) vì sao đúng
  "why_wrong": "…",                                       // (4) vì sao các lựa chọn khác sai
  "grammar": [                                            // (5) điểm ngữ pháp
    { "pattern": "N{中|ちゅう}", "explanation": "đang N.", "examples": ["{会議中|かいぎちゅう}です。(Đang họp.)"] }
  ],
  "vocab": [                                              // (6) từ vựng
    { "word": "工事", "reading": "こうじ", "meaning": "thi công", "word_id": null }
  ]
}
```

- Mục nào trống (`""` hoặc `[]`) thì không hiển thị. Thiếu cả 6 mục → cảnh báo "Câu chưa có lời giải".
- `word_id`: để `null`; khi nhập, hệ thống tự gắn mã từ nếu `word` + `reading` khớp một từ trong kho (từ chỉ viết kana thì `word` khớp kana). Từ có mã thì người học có nút "Thêm vào ôn tập".
- Câu ★ không cần ghi thứ tự đúng trong lời giải: màn hình lời giải tự hiển thị `3 → 2 (★) → 4 → 1` từ `star_order`.

## Cú pháp đánh dấu (DR-EX-08)

Dùng trong mọi trường nội dung (đề, lựa chọn, bài đọc, hướng dẫn, lời giải):

| Viết              | Hiển thị                                                         |
| ----------------- | ---------------------------------------------------------------- |
| `{漢字\|かんじ}`   | furigana nhỏ phía trên chữ                                       |
| `【…】`            | phần được hỏi, gạch chân như đề in                               |
| `**…**`           | chữ đậm (dùng trong lời giải)                                    |
| `（　）`           | chỗ trống                                                        |
| `[[18]]`          | chỗ trống đánh số trong bài đọc, trỏ tới câu 18 của **cùng phần thi** |
| bảng Markdown     | bảng (dòng đầu là tiêu đề, dòng thứ hai `\|---\|---\|`)        |
| `![mô tả](upload:<mã tệp>)` | ảnh, trên một dòng riêng; mã tệp có sau khi tải ảnh trong trình soạn |
| xuống dòng        | giữ nguyên; dòng trống ngăn cách đoạn                             |

Kiểm tra khi nhập (lỗi chặn nhập): furigana thiếu `|` hoặc thiếu `}`, `【` không đóng, `**` lẻ, `[[…]]` không phải số, bảng lệch số cột, ảnh không nằm riêng một dòng hoặc mã tệp không tồn tại, `[[n]]` không khớp câu nào của phần thi.

## Lỗi và cảnh báo

Trang nhập đề hiển thị mọi lỗi kèm vị trí: phần thi, `問題N`, số câu, trường, và với lỗi sai kiểu dữ liệu thì cả đường dẫn trong file (ví dụ `exam.sections[1].mondai[1].questions[0].options`).

| Lỗi (chặn nhập)                                        | Cảnh báo (không chặn)                         |
| ------------------------------------------------------ | --------------------------------------------- |
| File không phải JSON, sai `format_version`, sai kiểu   | Câu thiếu lời giải                            |
| Câu chọn 1 trong 4 không đủ 4 lựa chọn, trùng, chưa có đáp án | Bài đọc thiếu bản dịch                 |
| Câu ★ thiếu mảnh, ô ★ ngoài 1–4, thứ tự đúng không đủ 4 mảnh | Câu đang gắn cờ cần xem lại           |
| Cú pháp đánh dấu sai; `[[n]]` không khớp câu nào        | Hơn 40% đáp án đúng của một phần cùng vị trí  |
| Phần thi không có câu hoặc thiếu thời gian              | Dạng có bài đọc nhưng câu chưa gắn bài đọc    |
| Mondai chưa chọn dạng, dạng không tồn tại hoặc khác cấp; kiểu câu khác kiểu của dạng | |
| Hai bài đọc trùng `key`; câu trỏ tới bài đọc không có; số câu trùng trong phần thi | |
| Cấp độ đã có đề cùng tên                                | |

## Dạng mondai cấp N4 (mục 2.2)

| `type_id`            | Phần thi   | Dạng                          | Kiểu     | Bài đọc |
| -------------------- | ---------- | ----------------------------- | -------- | ------- |
| `n4_kanji_yomi`      | 文字・語彙 | Đọc kanji (漢字読み)            | choice   |         |
| `n4_hyouki`          | 文字・語彙 | Viết kanji (表記)               | choice   |         |
| `n4_bunmyaku`        | 文字・語彙 | Chọn từ theo ngữ cảnh (文脈規定) | choice   |         |
| `n4_iikae`           | 文字・語彙 | Câu đồng nghĩa (言い換え類義)    | choice   |         |
| `n4_youhou`          | 文字・語彙 | Cách dùng từ (用法)             | choice   |         |
| `n4_bun_bunpou1`     | 文法・読解 | Ngữ pháp câu (文の文法1)         | choice   |         |
| `n4_bun_bunpou2`     | 文法・読解 | Sắp xếp câu (文の文法2)          | star     |         |
| `n4_bunshou_bunpou`  | 文法・読解 | Ngữ pháp đoạn văn (文章の文法)   | choice   | có      |
| `n4_naiyou_tanbun`   | 文法・読解 | Đọc hiểu đoạn ngắn (内容理解・短文) | choice | có      |
| `n4_naiyou_chuubun`  | 文法・読解 | Đọc hiểu đoạn vừa (内容理解・中文) | choice  | có      |
| `n4_jouhou_kensaku`  | 文法・読解 | Tìm thông tin (情報検索)         | choice   | có      |

Danh sách này là dữ liệu tham chiếu: quản trị viên xem, sửa và thêm dạng (ví dụ dạng N5 khi có đề N5 đầu tiên) ở Quản trị → Đề thi → Dạng mondai.

## Chuyển đề từ PDF/markdown

Việc chuyển làm bên ngoài app (FR-IMP-01). Đề số 11 được chuyển từ `de-11.pdf` (đề, 4 lựa chọn, bài đọc như bản in) và ba file chữa đề `1-moji-goi.md`, `2-bunpou.md`, `3-dokkai.md` (lời giải 6 mục, bản đọc có furigana, bản dịch, mẹo làm bài). Furigana kiểu `漢字（かんじ）` trong bản chữa đề được đổi sang `{漢字|かんじ}`. Đáp án của cả 57 câu đã đối chiếu khớp bảng đáp án nhanh của bản chữa đề. Sau khi nhập, kiểm tra lại bằng màn hình xem trước (mục 7.2, điểm 6).

Hai câu gắn cờ cần xem lại theo điểm cần chốt số 2 (mục 7.2): câu 21 phần 文字・語彙 (lựa chọn 2 quá gần nghĩa) và câu 28 phần 文法・読解 (không rõ giới tính của ワンさん). Cả hai có ghi chú cho người học và ghi chú nội bộ nêu đề xuất sửa; nội dung câu giữ nguyên như đề gốc để chủ dự án quyết định.
