# Deploy lên server Ubuntu

Frontend, backend và PostgreSQL chạy trên **cùng một server Ubuntu 22.04 hoặc 24.04 LTS**, dưới **cùng một tên miền**. Nginx phục vụ file tĩnh của frontend và chuyển `/api` vào Node, nên trình duyệt chỉ thấy một domain: cookie `SameSite=Lax` hoạt động bình thường, không cần CORS.

```
Internet → Nginx :443 (HTTPS, Let's Encrypt)
             ├─ /      → /var/www/jpvocab (thư mục dist của frontend, SPA fallback về index.html)
             └─ /api/  → http://127.0.0.1:4000 (Node, chạy bằng systemd)
                             └─ PostgreSQL 127.0.0.1:5432 (không mở ra ngoài)
```

Các file cấu hình nằm trong `deploy/`:

| File | Dùng để |
|---|---|
| `jpvocab-api.service` | chạy API bằng systemd dưới user `jpvocab` |
| `nginx-jpvocab.conf` | Nginx: file tĩnh, SPA fallback, proxy `/api`, gzip, cache |
| `api.env.example` | mẫu biến môi trường production |
| `deploy.sh` | deploy bản mới (kéo code, build, migrate, khởi động lại, chép frontend) |
| `backup.sh`, `jpvocab-backup.cron` | sao lưu database mỗi đêm, giữ 14 bản |

Trong hướng dẫn này, thay `ten-mien-cua-ban.vn` bằng tên miền thật. Các lệnh chạy bằng một tài khoản quản trị có `sudo` (không phải `jpvocab`).

> Cần một tên miền trỏ về IP của server để lấy chứng chỉ HTTPS. Chưa có tên miền thì có thể chạy tạm bằng HTTP qua IP với `COOKIE_SECURE=false` và `NODE_ENV=development` (backend từ chối chạy production khi không có HTTPS). Cách này chỉ để thử, không dùng thật: mật khẩu và cookie đi qua mạng không mã hóa.

## 1. Chuẩn bị server

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl rsync nginx certbot python3-certbot-nginx

# Node.js LTS (24) từ NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource_setup.sh
sudo bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs
node -v   # v24.x

# Tường lửa: chỉ mở SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

User riêng cho ứng dụng, **không có quyền sudo**:

```bash
sudo adduser --system --group --home /home/jpvocab --shell /bin/bash jpvocab
```

## 2. PostgreSQL

Ubuntu 24.04 có sẵn PostgreSQL 16:

```bash
sudo apt install -y postgresql
```

Ubuntu 22.04 chỉ có PostgreSQL 14 trong kho mặc định; cài bản 16+ từ kho chính thức của PostgreSQL (apt.postgresql.org) theo hướng dẫn tại https://www.postgresql.org/download/linux/ubuntu/, rồi `sudo apt install -y postgresql-16`.

Tạo user và database riêng cho ứng dụng, với mật khẩu mạnh:

```bash
openssl rand -base64 24          # sinh mật khẩu, ghi lại để dùng ở bước 4
sudo -u postgres createuser --pwprompt jpvocab
sudo -u postgres createdb --owner=jpvocab jpvocab
```

PostgreSQL chỉ được lắng nghe trên localhost. Mặc định của Ubuntu đã như vậy; kiểm tra:

```bash
sudo -u postgres psql -tAc "SHOW listen_addresses"   # phải là: localhost
sudo ss -ltnp | grep 5432                             # chỉ thấy 127.0.0.1:5432 và [::1]:5432
```

## 3. Lấy mã nguồn

```bash
sudo -u jpvocab -H git clone <địa chỉ repo> /home/jpvocab/app
```

Repo private: tạo deploy key (`sudo -u jpvocab -H ssh-keygen -t ed25519`), thêm khóa công khai `/home/jpvocab/.ssh/id_ed25519.pub` vào repo với quyền chỉ đọc, rồi clone bằng địa chỉ SSH.

## 4. Biến môi trường production

```bash
sudo install -d -m 755 /etc/jpvocab
sudo install -o jpvocab -g jpvocab -m 600 \
  /home/jpvocab/app/vocabulary_japan_be/deploy/api.env.example /etc/jpvocab/api.env
sudo nano /etc/jpvocab/api.env
```

Sửa ít nhất các dòng sau:

| Biến | Giá trị |
|---|---|
| `DATABASE_URL` | `postgresql://jpvocab:<mật khẩu ở bước 2>@localhost:5432/jpvocab` (ký tự đặc biệt trong mật khẩu phải mã hóa URL, ví dụ `/` thành `%2F`) |
| `CORS_ORIGIN` | `https://ten-mien-cua-ban.vn` (đúng origin người dùng mở, không có `/` ở cuối) |
| `NODE_ENV` | `production` |
| `COOKIE_SECURE` | `true` |
| `HOST` | `127.0.0.1`, để Node chỉ nhận kết nối từ Nginx trên cùng máy |
| `APP_TIMEZONE` | `Asia/Ho_Chi_Minh` |

File có quyền 600 và thuộc `jpvocab`: chỉ user ứng dụng (và root) đọc được. Mỗi dòng dạng `KHOA=gia_tri`, không khoảng trắng quanh `=`, không dấu nháy, vì `deploy.sh` đọc file này bằng `source`.

## 5. Build lần đầu, tạo bảng, seed

```bash
cd /home/jpvocab/app/vocabulary_japan_be
sudo -u jpvocab -H bash -c 'npm ci --include=dev && npm run build'
sudo -u jpvocab -H bash -c 'set -a; source /etc/jpvocab/api.env; set +a; npx prisma migrate deploy'

# Chủ đề và từ vựng (ở production, seed bỏ qua tài khoản và lịch sử mẫu)
sudo -u jpvocab -H bash -c 'set -a; source /etc/jpvocab/api.env; set +a; npm run db:seed'

# Tài khoản admin thật
sudo -u jpvocab -H bash -c "set -a; source /etc/jpvocab/api.env; set +a; \
  npm run create-admin -- --email ban@ten-mien-cua-ban.vn --password 'mat-khau-manh' --name 'Quản trị viên'"
```

`--include=dev` là bắt buộc: `NODE_ENV=production` làm `npm ci` bỏ qua devDependencies (TypeScript, tsx), trong khi bước build và seed cần chúng.

## 6. Chạy API bằng systemd

```bash
sudo cp /home/jpvocab/app/vocabulary_japan_be/deploy/jpvocab-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now jpvocab-api
sudo systemctl status jpvocab-api
curl -fsS http://127.0.0.1:4000/api/health      # {"ok":true}
```

Service chạy `node dist/server.js` dưới user `jpvocab`, đọc biến môi trường từ `/etc/jpvocab/api.env` và tự khởi động lại khi lỗi.

Xem log:

```bash
journalctl -u jpvocab-api -f          # theo dõi trực tiếp
journalctl -u jpvocab-api -n 200      # 200 dòng gần nhất
```

Log không chứa mật khẩu hay cookie (đã được ẩn trước khi ghi).

## 7. Frontend

```bash
sudo install -d -o root -g root -m 755 /var/www/jpvocab
cd /home/jpvocab/app/vocabulary_japan_fe
sudo -u jpvocab -H bash -c 'npm ci --include=dev && VITE_API_MODE=real VITE_API_URL= npm run build'
sudo rsync -a --delete dist/ /var/www/jpvocab/
```

`VITE_API_MODE=real` và `VITE_API_URL` để trống: frontend gọi `/api` trên chính domain của nó, Nginx chuyển vào Node.

## 8. Nginx và HTTPS

```bash
sudo cp /home/jpvocab/app/vocabulary_japan_be/deploy/nginx-jpvocab.conf /etc/nginx/sites-available/jpvocab
sudo sed -i 's/ten-mien-cua-ban.vn/<tên miền thật>/' /etc/nginx/sites-available/jpvocab
sudo ln -s /etc/nginx/sites-available/jpvocab /etc/nginx/sites-enabled/jpvocab
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Chứng chỉ Let's Encrypt; certbot tự thêm cấu hình 443 và chuyển hướng HTTP → HTTPS
sudo certbot --nginx -d <tên miền thật>
sudo certbot renew --dry-run     # kiểm tra tự gia hạn
```

Cấu hình Nginx gồm:
- `try_files $uri /index.html`, để tải lại trang ở bất kỳ đường dẫn nào (`/tu-vung`, `/quan-tri`…) vẫn mở được app.
- `location /api/` proxy sang `127.0.0.1:4000`, kèm `X-Forwarded-For` và `X-Forwarded-Proto`. Express bật `trust proxy` (chỉ tin proxy trên localhost), nên rate limit tính theo IP thật của người dùng.
- gzip, cache một năm cho `/assets/` (tên file có hash), không cache `index.html`, `client_max_body_size 6m`.

Mở `https://<tên miền thật>` và đăng nhập bằng tài khoản admin ở bước 5.

## 9. Deploy bản mới

Sau lần cài đầu tiên, mỗi lần deploy chỉ cần:

```bash
bash /home/jpvocab/app/vocabulary_japan_be/deploy/deploy.sh
```

Script dừng ngay nếu một bước lỗi (`set -euo pipefail`), lần lượt:
1. Kéo code mới (`git pull --ff-only`).
2. `npm ci` và build backend.
3. `prisma migrate deploy`.
4. Khởi động lại service.
5. Chờ `/api/health` trả lời.
6. Build frontend.
7. Chép `dist/` vào `/var/www/jpvocab`.

Code, build và migration chạy dưới user `jpvocab`; chỉ bước khởi động lại và chép frontend cần sudo.

## 10. Sao lưu và khôi phục

Cài sao lưu tự động lúc 02:30 mỗi đêm, giữ 14 bản gần nhất:

```bash
cd /home/jpvocab/app/vocabulary_japan_be
sudo install -m 755 deploy/backup.sh /usr/local/bin/jpvocab-backup
sudo install -d -o postgres -g postgres -m 700 /var/backups/jpvocab
sudo cp deploy/jpvocab-backup.cron /etc/cron.d/jpvocab-backup
sudo -u postgres /usr/local/bin/jpvocab-backup     # chạy thử ngay
sudo ls -lh /var/backups/jpvocab
```

Bản sao lưu là file `pg_dump` định dạng custom (`jpvocab-YYYYmmdd-HHMMSS.dump`). Kết quả mỗi lần chạy ghi vào syslog (`journalctl -t jpvocab-backup`). Nên chép thêm các bản sao lưu ra máy khác hoặc kho lưu trữ ngoài server.

**Khôi phục từ một bản sao lưu:**

```bash
# 1. Dừng API để không ai ghi dữ liệu trong lúc khôi phục
sudo systemctl stop jpvocab-api

# 2. Khôi phục (xóa đối tượng cũ rồi tạo lại từ bản sao lưu, giữ chủ sở hữu jpvocab)
sudo -u postgres pg_restore --clean --if-exists -d jpvocab /var/backups/jpvocab/jpvocab-YYYYmmdd-HHMMSS.dump

# 3. Bật lại API và kiểm tra
sudo systemctl start jpvocab-api
curl -fsS http://127.0.0.1:4000/api/health
```

Muốn xem thử một bản sao lưu mà không đụng database đang chạy, khôi phục vào database tạm:

```bash
sudo -u postgres createdb jpvocab_check
sudo -u postgres pg_restore -d jpvocab_check /var/backups/jpvocab/jpvocab-YYYYmmdd-HHMMSS.dump
sudo -u postgres psql -d jpvocab_check -c "SELECT count(*) FROM words"
sudo -u postgres dropdb jpvocab_check
```

## Khắc phục sự cố

| Triệu chứng | Kiểm tra |
|---|---|
| Trang trắng hoặc 502 ở `/api` | `systemctl status jpvocab-api`, `journalctl -u jpvocab-api -n 100` |
| API không khởi động, log báo "Biến môi trường không hợp lệ" | sửa `/etc/jpvocab/api.env` theo dòng báo lỗi |
| Đăng nhập được nhưng mọi thao tác lưu báo 403 | `CORS_ORIGIN` phải trùng đúng origin trên thanh địa chỉ (`https://`, không có `/` cuối) |
| Đăng nhập xong bị đăng xuất ngay | đang mở bằng HTTP trong khi `COOKIE_SECURE=true`: dùng HTTPS |
| Tải lại trang ở `/tu-vung` báo 404 | Nginx thiếu `try_files $uri /index.html` |
| Rate limit chặn mọi người cùng lúc | Nginx thiếu `X-Forwarded-For`, hoặc API không chạy sau Nginx trên cùng máy |
