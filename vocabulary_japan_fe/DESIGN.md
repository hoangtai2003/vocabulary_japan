# Plan thiết kế – "Sổ luyện chữ"

App trông như một cuốn vở tập viết tiếng Nhật: giấy ngà, mực đen, ô kẻ genkō yōshi, con dấu son.
Mọi sự táo bạo dồn vào flashcard và hàng ô tiến độ; phần còn lại tĩnh và kỷ luật.

## 1. Token màu

Khai báo bằng CSS variables trong `src/index.css`, Tailwind đọc qua `@theme inline`.
Tỉ lệ tương phản đã tính theo WCAG, so với nền giấy (`paper`) và nền thẻ (`surface`).

| Token         | Vai trò                                    | Sáng      | Tối       | Tương phản (sáng / tối)                 |
| ------------- | ------------------------------------------ | --------- | --------- | --------------------------------------- |
| `paper`       | Nền trang                                  | `#F6F1E7` | `#16140F` | —                                       |
| `surface`     | Nền thẻ, panel (sáng hơn giấy một chút)    | `#FBF8F1` | `#1E1B15` | —                                       |
| `ink`         | Chữ chính                                  | `#1E1B16` | `#EDE6D8` | 15.3 / 14.8                             |
| `ink-muted`   | Chữ phụ, nhãn                              | `#625A4E` | `#A99F8E` | 6.0 / 7.0                               |
| `rule`        | Đường kẻ ô, đường phân cách (trang trí)    | `#D9CFBF` | `#3A342B` | 1.4 / 1.5, không dùng cho chữ           |
| `rule-strong` | Viền ô nhập, viền nút phụ (thành phần UI)  | `#8C8070` | `#776D5D` | 3.4 / 3.6 (≥ 3:1, WCAG 1.4.11)          |
| `son`         | Màu nhấn duy nhất: nút chính, tiến độ, dấu | `#C2362B` | `#E0574A` | 4.8 / 4.9                               |
| `on-son`      | Chữ trên nền son                           | `#F6F1E7` | `#16140F` | 4.8 / 4.9                               |
| `son-ink`     | Chữ son trên giấy (liên kết, lỗi)          | `#A52B21` | `#E0574A` | 6.3 / 4.9                               |
| `son-wash`    | Nền nhạt cho hộp lỗi, ô hôm nay            | `#F3DCD6` | `#33201B` | chữ `ink` 13.1 / 12.4                   |
| `moss`        | Tô nền "đúng", "đã thuộc"                  | `#4F7A4A` | `#7FA877` | chỉ dùng tô nền, không dùng làm chữ nhỏ |
| `moss-ink`    | Chữ trạng thái đúng / đã thuộc             | `#446B40` | `#7FA877` | 5.5 / 6.8                               |
| `moss-wash`   | Nền nhạt cho đáp án đúng                   | `#DCE7D6` | `#1F2A1C` | chữ `moss-ink` 4.8 / 5.5                |

Hai điểm sửa sau khi kiểm tra tương phản:

- **Rêu.** Màu `#4F7A4A` trên giấy sáng chỉ đạt 4.43:1, không đủ cho chữ thường. Chữ dùng `moss-ink` `#446B40`; `moss` chỉ để tô nền hoặc chữ lớn.
- **Viền ô nhập.** Màu kẻ ô `#D9CFBF` chỉ đạt 1.4:1. Viền ô nhập và nút phụ dùng `rule-strong`; `rule` chỉ để kẻ ô trang trí.

## 2. Chữ

| Vai trò                  | Font                                | Cỡ                              |
| ------------------------ | ----------------------------------- | ------------------------------- |
| Kanji/kana lớn trên thẻ  | Noto Serif JP 600                   | 96px điện thoại, 140px từ 768px |
| Chữ Nhật trong giao diện | Noto Sans JP 400/500                | theo thang                      |
| Tiêu đề Latin/Việt       | Fraunces 600 (có subset vietnamese) | 28 / 22 / 18                    |
| Nội dung Latin/Việt      | Be Vietnam Pro 400/500/600          | 16 (gốc), 14 (phụ), 12 (nhãn)   |

- Thang cỡ chữ: 12 · 14 · 16 · 18 · 22 · 28 · 36.
- Chữ số trong bộ đếm dùng `tabular-nums`, để con số không nhảy khi thay đổi.
- Tất cả tải từ Google Fonts với `display=swap`.

## 3. Hình khối và chuyển động

- **Bo góc:** 6px cho nút và ô nhập, 10px cho thẻ.
- **Không gradient, không bóng đổ.** Các lớp tách nhau bằng viền 1px `rule` và nền `surface`.
- **Focus:** viền son 2px, cách 2px (`outline-offset: 2px`) cho mọi phần tử focus được.
- **Chuyển động:**
  - Lật thẻ 3D (400 ms).
  - Tô ô tiến độ (200 ms).
  - Chuyển trang: mờ dần và nhích lên 4px (180 ms).
  - Đóng dấu son: phóng từ 1.4 về 1 kèm xoay nhẹ (300 ms).
  - Khi `prefers-reduced-motion: reduce`: mọi chuyển động thành mờ dần hoặc tắt hẳn.
- **Icon:** chỉ dùng khi mang chức năng (điều hướng, nút icon). Không dùng icon trang trí cạnh tiêu đề.

## 4. Wireframe

### Hôm nay – điện thoại (360px)

```
┌────────────────────────────────────┐
│ Chào Minh Anh                       │  ← Fraunces 28
│ Bạn đã học 4 ngày liền.             │  ← streak nằm trong câu, không phải ô chỉ số
│                                    │
│ Hôm nay  3/10 từ mới                │  ← nhãn + số thật
│ ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐               │
│ │■│■│■│ │ │ │ │ │ │ │               │  ← hàng ô genkō, ô đã học tô son
│ └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘               │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ Bạn còn 8 từ cần ôn         →  │ │  ← cả thẻ là một liên kết tới /on-tap
│ └────────────────────────────────┘ │
│                                    │
│ Từ mới hôm nay                      │
│ ────────────────────────────────── │
│ 水   みず    nước              済  │  ← từ đã học có dấu son nhỏ
│ ご飯 ごはん  cơm               済  │
│ 肉   にく    thịt                  │
│ …                                  │
│                                    │
│ [        Bắt đầu học         ]     │  ← nút son, rộng hết hàng
├────────────────────────────────────┤
│ Hôm nay  Học  Ôn tập⁸  Quiz  Thêm  │  ← thanh dưới, 5 mục
└────────────────────────────────────┘
```

### Flashcard – mặt trước và mặt sau (điện thoại)

```
 3 / 10  ■■■□□□□□□□          [Furigana: bật]
┌────────────────────────────────────┐
│ ┌──────────────┬───────────────┐   │
│ │              ┆      がっこう  │   │  ← ô vuông genkō, chữ thập mờ ở giữa
│ │            学 校              │   │  ← Noto Serif JP ≥ 96px
│ ├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┼┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤   │
│ │              ┆               │   │
│ └──────────────┴───────────────┘   │
│                         [chỗ trống] │  ← để dành chỗ cho nút nghe sau này, không đổi bố cục
└────────────────────────────────────┘
          [ Lật thẻ · Space ]

──── sau khi lật ────
┌────────────────────────────────────┐
│ 学校  がっこう · gakkou        (良) │  ← con dấu son khi chấm "Dễ"
│ trường học                          │
│ Danh từ · Trường học                │
│ ────────────────────────────────── │
│ 学校は八時に始まります。             │
│ がっこうははちじにはじまります。     │
│ gakkou wa hachiji ni hajimarimasu.  │
│ Trường học bắt đầu lúc tám giờ.     │
└────────────────────────────────────┘
 [Quên 1] [Khó 2] [Được 3] [Dễ 4]       ← chỉ hiện sau khi lật
```

### Desktop (≥ 768px)

```
┌──────────────┬───────────────────────────────────────┐
│ (字) Sổ luyện │                                       │
│      chữ     │   nội dung trang, rộng tối đa 720px    │
│              │                                       │
│ ▪ Hôm nay    │                                       │  ← mục đang mở: ô vuông son nhỏ bên trái
│   Học        │                                       │
│   Ôn tập   8 │                                       │
│   Quiz       │                                       │
│   Từ vựng    │                                       │
│   Tiến độ    │                                       │
│   Hồ sơ      │                                       │
│   Quản trị   │  ← chỉ admin                           │
│ ──────────── │                                       │
│ Minh Anh     │                                       │
│ Đăng xuất    │                                       │
└──────────────┴───────────────────────────────────────┘
```

## 5. Tự soát: chỗ nào trông mặc định, và cách sửa

| Chỗ trông mặc định                                                    | Sửa thành                                                                                                                                                                         |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar có mục đang chọn tô nền kiểu "pill", giống mọi dashboard SaaS | Không tô nền. Mục đang chọn có ô vuông son 8px bên trái và chữ đậm hơn, giống đánh dấu trong vở. Sidebar ngăn với nội dung bằng một đường kẻ đôi như lề vở.                       |
| Trang Hôm nay mở đầu bằng hàng 3–4 ô chỉ số (streak, đã học, cần ôn)  | Streak nằm trong câu chào. Số thẻ cần ôn là một câu hành động có thể bấm. Chỉ có một chỗ hiển thị tiến độ là hàng ô genkō.                                                        |
| Thanh tiến độ bo tròn chạy dần                                        | Hàng ô vuông có viền `rule`, mỗi ô là một từ, tô son dần. Chỉ khi quá 30 ô (phiên ôn dài) mới dùng thanh mảnh 4px, không bo tròn.                                                 |
| Nút chính bo tròn hẳn, có bóng                                        | Bo 6px, nền son phẳng, chữ Be Vietnam Pro 600. Khi nhấn chỉ lún 1px, không đổ bóng.                                                                                               |
| Thẻ trắng có shadow                                                   | Nền `surface` hơi sáng hơn giấy, viền 1px `rule`, không bóng.                                                                                                                     |
| Thanh điều hướng dưới có icon to và nền đặc                           | Nền giấy với đường kẻ trên 1px. Icon 20px, nhãn 12px. Mục đang chọn có gạch son 2px phía trên icon. Huy hiệu là số trong ô vuông son nhỏ, không phải chấm tròn đỏ kiểu thông báo. |
| Màn hình chờ là spinner giữa trang                                    | Ô genkō trống với một nét son đang được tô (chỉ chạy khi cho phép chuyển động). Skeleton của từng trang vẽ đúng hình nội dung.                                                    |
| Trang 404 / 403 chỉ có một dòng chữ và nút                            | Một ô genkō lớn chứa chữ 無 (404) hoặc 禁 (403), bên dưới là một câu ngắn và đúng một hành động.                                                                                  |
| Toast có icon tròn và màu nền đậm                                     | Thẻ giấy viền `rule-strong` có vạch màu 3px bên trái: son cho lỗi, rêu cho thành công. Chữ ngắn, viết theo thể chủ động.                                                          |

## 6. Ghi chú triển khai

- **Dark mode:**
  - Bật bằng class `.dark` trên `<html>`. Script trong `index.html` áp class này trước khi React render.
  - `themeStore` ghi lựa chọn vào khóa `jpvocab:theme`.
  - Khi người dùng đã đăng nhập, `settings.theme` từ server ghi đè lựa chọn trong localStorage.
- **Bố cục:**
  - Nội dung trang rộng tối đa 720px.
  - Lề ngang 16px trên điện thoại, 32px trên desktop.
  - Trên điện thoại, chừa khoảng trống phía dưới bằng chiều cao thanh điều hướng cộng `safe-area-inset-bottom`.

## 7. Tự phê bình sau khi build (giai đoạn 3)

Đã chụp màn hình bằng Chrome headless ở 360px và 1280px, cả bản sáng lẫn bản tối. Không có trang nào bị cuộn ngang.

| Nhận xét                                                                              | Xử lý                                                                          |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Tiêu đề trang 403 trên 360px xuống dòng để lại một chữ mồ côi ("quản trị / viên").    | Thêm `text-wrap: balance` cho h1–h3.                                           |
| Trang trắng một nhịp khi mở thẳng một đường dẫn, vì router chờ tải mã của trang lazy. | Đặt `HydrateFallback` trên route gốc là màn hình chờ ô genkō.                  |
| Mục "Thêm" trên thanh dưới không sáng khi đang ở Từ vựng, Tiến độ, Hồ sơ, Quản trị.   | Đánh dấu "Thêm" đang chọn cho mọi đường dẫn thuộc nhóm này.                    |
| Huy hiệu số thẻ cần ôn đè lên icon trên thanh dưới.                                   | Giữ nguyên: ô son lệch phải-trên vẫn đọc rõ, và icon vẫn nhận ra được ở 360px. |
| Cột nội dung ở 1280px nằm giữa vùng còn lại, cách sidebar khá xa.                     | Giữ nguyên ở giai đoạn này. Xem lại khi có nội dung thật ở giai đoạn 4.        |

## 8. Tự phê bình: trang Hôm nay

| Nhận xét                                                                                           | Xử lý                                                                                              |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Wireframe đặt nút "Bắt đầu học" sau danh sách; với mục tiêu 20 từ, nút bị đẩy xuống khỏi màn hình. | Đặt nút chính ngay dưới hàng ô tiến độ. Danh sách từ xuống cuối trang.                             |
| Desktop: hàng ô chỉ dài ~360px, còn số "0/10 từ" nằm ở mép phải 656px, hai phần rời nhau.          | Số đếm đặt ngay cạnh nhãn. Ô lớn tối đa 48px trên desktop, hàng ô trông như một dòng giấy genkō.   |
| Tài khoản chưa học từ nào thấy "Bạn đã ôn xong" — đúng về số liệu nhưng sai về ý.                  | Phân biệt hai trường hợp: chưa học gì ("Chưa có từ nào cần ôn…") và đã ôn hết ("Bạn đã ôn xong."). |
| Streak hiển thị dạng ô chỉ số.                                                                     | Giữ đúng plan: streak nằm trong câu, và nhắc "Học hôm nay để giữ chuỗi" khi hôm nay chưa học.      |

## 9. Tự phê bình: Flashcard và Ôn tập

| Nhận xét                                                                                         | Xử lý                                                                                                                 |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Kanji tối thiểu 96px làm từ 5–6 ký tự (乗り換える, いただきます) tràn ngang thẻ trên điện thoại. | Cỡ chữ = min(96px, bề ngang khả dụng / số ký tự); desktop min(140px, 26rem / số ký tự). Từ ≤ 3 ký tự vẫn đủ 96/140px. |
| Furigana "み ず" bị giãn theo bề ngang kanji (Chrome mặc định căn ruby kiểu space-around).       | `ruby-align: center`.                                                                                                 |
| Desktop: hàng tiến độ rộng 656px, thẻ rộng 480px, số "2 / 10" bị tách ra mép phải.               | Cả phiên (tiêu đề, tiến độ, thẻ, nút, tổng kết) nằm chung một cột 480px.                                              |
| Mặt sau có khoảng trống lớn giữa nghĩa và câu ví dụ (câu ví dụ bị đẩy xuống đáy thẻ vuông).      | Câu ví dụ đi liền sau phần nghĩa. Khoảng trống còn lại dồn xuống dưới, mắt không phải nhảy xa.                        |
| Focus vào nút chấm sau khi lật thì lần bấm Space kế tiếp sẽ bấm nhầm "Quên".                     | Focus vào vùng thẻ (tabIndex −1). Phím tắt bỏ qua Space/Enter khi focus đang ở nút.                                   |
| Reduced motion: cần chắc mờ dần thật sự chạy, không bị quy tắc "tắt mọi transition" đè.          | Đo trong Chrome: opacity 0 → 1 trong ~200ms, không xoay 3D.                                                           |

## 10. Tự phê bình: Quiz

| Nhận xét                                                                               | Xử lý                                                                                                       |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Chữ đề tiếng Nhật 48px trông nhỏ trong ô genkō rộng, không cân với flashcard.          | 64px điện thoại, 88px desktop, từ dài thu nhỏ theo số ký tự (`.quiz-glyph`), Noto Serif JP như thẻ.         |
| Danh sách câu sai chỉ có chữ kanji; người học không ôn lại được cách đọc.              | Mỗi câu sai kèm kana · romaji. Lựa chọn sai gạch ngang màu son, đáp án đúng đậm màu rêu.                    |
| Sau khi chọn, đáp án bị khóa; nếu focus nằm trên nút đáp án thì Enter có thể bấm nhầm. | Chọn xong, focus chuyển sang nút "Tiếp". Đáp án dùng `aria-disabled` (vẫn đọc được), bấm không có tác dụng. |
| Kết quả chỉ là con số.                                                                 | Đóng dấu theo thang điểm trường Nhật: 優 (≥ 90%), 良 (≥ 70%), 可 (≥ 50%). Dưới 50% không đóng dấu.          |
| Ô chọn cấu hình dễ trông như radio mặc định.                                           | Ô có viền, ô đang chọn viền mực và ô vuông son nhỏ. Radio thật vẫn nằm bên dưới, dùng được phím mũi tên.    |

## 11. Tự phê bình: Từ vựng

| Nhận xét                                                                                      | Xử lý                                                                                                    |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Cột 720px không đủ cho danh sách + panel chi tiết.                                            | Route có `handle.wide`: AppLayout nới cột lên 1120px chỉ cho trang này.                                  |
| Panel bên phải ở 768–1023px làm danh sách quá hẹp.                                            | Panel chỉ từ 1024px. Hẹp hơn dùng drawer trượt từ đáy (Modal `placement="sheet"`, giữ focus, Esc đóng).  |
| Ô chọn bị cắt chữ ("Mọi trạng th", "Mọi chủ ¢") khi cột danh sách hẹp lại vì có panel.        | Lựa chọn mặc định là tên bộ lọc ("Cấp độ", "Chủ đề", "Trạng thái"). Từ 1024px bộ lọc xếp 2 cột × 2 hàng. |
| "Xóa bộ lọc" không xóa ô tìm kiếm (URL cập nhật trong transition, ô tìm kiếm đọc lại `q` cũ). | Trang giữ nội dung ô tìm kiếm; "Xóa bộ lọc" đặt lại ngay trong event handler.                            |
| Trạng thái học chỉ là chữ, khó quét nhanh khi lướt danh sách.                                 | Ô vuông nhỏ tô đậm dần: viền rỗng (chưa học) → xám → mực → rêu (đã thuộc).                               |
| Từ đang mở trong panel khó nhận ra trong danh sách.                                           | Dòng đang mở có vạch son 2px bên trái và nền nhạt, `aria-current`.                                       |

## 12. Tự phê bình: Tiến độ (theo skill dataviz)

Màu dữ liệu được chọn sau cùng và kiểm bằng `validate_palette.js`, không chọn bằng mắt.

| Vai trò                          | Sáng                                    | Tối                                     | Kết quả validator                                          |
| -------------------------------- | --------------------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| Cột "Từ mới" (slot 1)            | son `#C2362B`                           | `#E0574A`                               | Qua cả 5 kiểm tra; CVD ΔE 17.8 (sáng) / 19.5 (tối)         |
| Cột "Lượt ôn" (slot 2)           | chàm 藍 `#3464A0`                       | `#5890CD`                               | (cùng lượt kiểm với slot 1)                                |
| Heatmap (ordinal, 4 bậc, 1 tông) | `#EA998C` `#DA6D5F` `#C13D31` `#901F17` | `#96372D` `#C4493C` `#E26C5E` `#F4A296` | Lightness đơn điệu, ΔL ≥ 0.06, bậc nhạt nhất 2.1:1 / 2.4:1 |

| Nhận xét                                                                                                                       | Xử lý                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Ý đầu tiên là son + mực cho hai series; validator FAIL: mực gần đen bị đọc như xám (chroma 0.01).                              | Đổi sang chàm 藍 (mực xanh truyền thống), tăng chroma trong OKLCH tới mức nhỏ nhất qua kiểm tra (0.11).                      |
| Rêu không dùng làm series vì đã mang nghĩa trạng thái (đúng / đã thuộc).                                                       | Giữ rêu cho trạng thái; series dùng son + chàm.                                                                              |
| Bậc nhạt nhất của heatmap ban đầu chỉ 1.5:1 với nền — ô "ít" gần như biến mất.                                                 | Dịch cả thang về phía đậm; bậc nhạt nhất ≥ 2:1.                                                                              |
| Nhãn trực tiếp ở tuần mới nhất không hiện: Recharts 3 truyền toạ độ qua `viewBox`, và `index` đếm theo cột được vẽ (bỏ cột 0). | Đọc `viewBox`; tính vị trí cột mới nhất trong các cột khác 0. Test kiểm nhãn khớp hàng cuối bảng số liệu.                    |
| Ô heatmap không phản hồi khi rê chuột.                                                                                         | Ô đang trỏ có viền mực; tooltip hiện số lượt (đậm) rồi ngày.                                                                 |
| Biểu đồ chỉ đọc được bằng mắt.                                                                                                 | Nút "Xem dạng bảng" (bảng số liệu đầy đủ); heatmap là lưới `role="grid"` có `aria-label` mỗi ô, di chuyển bằng phím mũi tên. |
| Bốn ô chỉ số dễ thành hàng "KPI tile" kiểu SaaS.                                                                               | Lưới ô kẻ như bảng trong vở (viền `rule`, không bóng); số dùng Be Vietnam Pro, không dùng chữ serif.                         |
