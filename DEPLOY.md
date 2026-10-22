# Deploy bằng Docker

Frontend, backend và PostgreSQL chạy bằng Docker Compose trên **một server**, dưới **một tên miền**. Caddy phục vụ file tĩnh của frontend, chuyển `/api` vào container API và tự lấy, tự gia hạn chứng chỉ HTTPS. Trình duyệt chỉ thấy một domain, nên cookie `SameSite=Lax` hoạt động bình thường và không cần CORS.

```
Internet → web (Caddy :80/:443, HTTPS tự động)
             ├─ /      → file tĩnh của frontend (SPA fallback về index.html)
             └─ /api/* → api:4000 (Node)
                             └─ db:5432 (PostgreSQL, dữ liệu trong volume db-data)
```

Chỉ container `web` mở cổng ra ngoài. `api` và `db` chỉ nằm trong mạng nội bộ của Compose.

| File | Dùng để |
|---|---|
| `docker-compose.yml` | khai báo 4 service: `db`, `migrate` (chạy migration rồi thoát), `api`, `web` |
| `.env.example` | mẫu biến môi trường (chép thành `.env`) |
| `vocabulary_japan_be/Dockerfile` | image API |
| `vocabulary_japan_fe/Dockerfile` | image web: build frontend, phục vụ bằng Caddy |
| `deploy/Caddyfile` | Caddy: HTTPS, file tĩnh, SPA fallback, proxy `/api`, nén, cache |
| `deploy/deploy.sh` | deploy bản mới |

Server: Ubuntu 22.04 hoặc 24.04, **nên có từ 2 GB RAM** (bước build frontend tốn RAM; với 1 GB, xem mục "Khắc phục sự cố"). Thay `ten-mien-cua-ban.vn` bằng tên miền thật. Các lệnh chạy bằng tài khoản có `sudo`.

## 1. Chuẩn bị server

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl

# Tường lửa: chỉ mở SSH, HTTP, HTTPS (443/udp cho HTTP/3)
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443
sudo ufw enable
```

> Docker tự thêm luật iptables cho các cổng nó mở, không đi qua ufw. Vì vậy compose **chỉ** mở cổng 80/443 của `web`; tuyệt đối không thêm `ports:` cho `db` hay `api`.

Cài Docker Engine và plugin Compose từ kho chính thức của Docker:

```bash
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sudo sh /tmp/get-docker.sh
docker --version && docker compose version
```

Cho tài khoản hiện tại dùng Docker mà không cần `sudo`, rồi **đăng xuất và SSH lại** để có hiệu lực:

```bash
sudo usermod -aG docker $USER
```

> Nhóm `docker` tương đương quyền root trên server. Chỉ thêm tài khoản quản trị của bạn vào nhóm này.

**Đã từng cài theo cách cũ (Nginx, PostgreSQL, Node trên máy)?** Nginx đang giữ cổng 80 sẽ làm Caddy không khởi động được. Hãy tắt nó đi. PostgreSQL trên máy không chiếm cổng của Docker nhưng không còn dùng nữa:

```bash
sudo systemctl disable --now nginx
sudo systemctl disable --now postgresql      # nếu đã cài
# Gỡ hẳn (không bắt buộc): sudo apt purge -y nginx postgresql* nodejs
```

## 2. Lấy mã nguồn

```bash
sudo mkdir -p /opt/jpvocab && sudo chown $USER: /opt/jpvocab
git clone https://github.com/hoangtai2003/vocabulary_japan.git /opt/jpvocab
cd /opt/jpvocab
```

Repo private: tạo deploy key (`ssh-keygen -t ed25519`), thêm `~/.ssh/id_ed25519.pub` vào repo trên GitHub (Settings → Deploy keys, chỉ đọc), rồi clone bằng địa chỉ SSH `git@github.com:hoangtai2003/vocabulary_japan.git`.

Các bước sau đều chạy trong `/opt/jpvocab`.

## 3. Biến môi trường

Trỏ tên miền về server trước bước này: tạo bản ghi **A** cho `ten-mien-cua-ban.vn` với giá trị là IP server, rồi kiểm tra bằng `getent hosts ten-mien-cua-ban.vn`.

```bash
cp .env.example .env
chmod 600 .env
openssl rand -hex 24        # sinh mật khẩu database, copy kết quả
nano .env
```

| Biến | Giá trị |
|---|---|
| `SITE_ADDRESS` | `ten-mien-cua-ban.vn` |
| `PUBLIC_URL` | `https://ten-mien-cua-ban.vn` (đúng địa chỉ người dùng mở, không có `/` ở cuối) |
| `POSTGRES_PASSWORD` | chuỗi vừa sinh |
| `APP_TIMEZONE` | `Asia/Ho_Chi_Minh` |

`.env` có quyền 600 và nằm trong `.gitignore`, nên không bao giờ lên git.

> **Chưa có tên miền?** Có thể chạy thử bằng IP qua HTTP: đặt `SITE_ADDRESS=:80`, `PUBLIC_URL=http://<IP-server>`, `COOKIE_SECURE=false`, `NODE_ENV=development` (backend từ chối chạy production khi không có HTTPS). Cách này chỉ để thử: mật khẩu và cookie đi qua mạng không mã hóa, và bước seed sẽ tạo thêm 2 tài khoản mẫu có mật khẩu `123456`. Khi có tên miền, sửa lại 4 dòng này rồi làm lại từ bước 4 trên một database mới (`docker compose down -v`, **lệnh này xóa hết dữ liệu**).

## 4. Build và khởi động

```bash
docker compose up -d --build --wait
docker compose ps
```

Lần đầu mất vài phút để build. Compose lần lượt khởi động `db`, chạy `migrate` (tạo bảng, rồi container thoát với trạng thái `Exited (0)`), sau đó `api` và cuối cùng `web`. `--wait` chỉ trả về khi mọi container đã khỏe; có bước nào lỗi thì lệnh báo lỗi.

Kết quả đúng: `db`, `api`, `web` ở trạng thái `Up ... (healthy)` hoặc `Up`, còn `migrate` là `Exited (0)`.

Ngay khi `web` chạy, Caddy tự xin chứng chỉ Let's Encrypt cho tên miền. Xem tiến trình:

```bash
docker compose logs -f web      # Ctrl+C để thoát; thấy "certificate obtained successfully" là xong
```

## 5. Dữ liệu ban đầu và tài khoản admin

```bash
# Chủ đề và từ vựng (ở production, seed bỏ qua tài khoản và lịch sử mẫu). Chạy lại không tạo trùng.
docker compose exec api node prisma/seed.ts

# Tài khoản admin thật
docker compose exec api node src/scripts/create-admin.ts \
  --email ban@ten-mien-cua-ban.vn --password 'mat-khau-manh' --name 'Quản trị viên'
```

Mở `https://ten-mien-cua-ban.vn` và đăng nhập bằng tài khoản admin vừa tạo.

## 6. Xem log, khởi động lại

```bash
docker compose ps                     # trạng thái các container
docker compose logs -f api            # log API trực tiếp (dạng JSON, đã ẩn mật khẩu và cookie)
docker compose logs --tail 200 api    # 200 dòng gần nhất
docker compose restart api            # khởi động lại API
docker compose down                   # dừng tất cả (giữ nguyên dữ liệu)
docker compose up -d                  # chạy lại
```

Mọi container có `restart: unless-stopped`, nên tự chạy lại khi server khởi động lại hoặc khi tiến trình bị lỗi.

> **Không bao giờ chạy `docker compose down -v`** trên server thật: `-v` xóa volume `db-data`, tức là toàn bộ database.

## 7. Deploy bản mới

Sau khi push code lên GitHub, trên server chạy:

```bash
/opt/jpvocab/deploy/deploy.sh
```

Script dừng ngay nếu một bước lỗi:
1. Kéo code mới (`git pull --ff-only`).
2. `docker compose up -d --build --wait`: build image mới, chạy migration, thay container. Container cũ vẫn chạy trong lúc build, nên trang chỉ gián đoạn vài giây khi đổi container.
3. Xóa image cũ không còn dùng.

## Khắc phục sự cố

| Triệu chứng | Kiểm tra |
|---|---|
| `docker compose up` báo cổng 80 hoặc 443 đã bị dùng | Nginx hoặc Apache cũ còn chạy: `sudo ss -ltnp \| grep -E ':80\|:443'`, tắt theo mục 1 |
| `migrate` lỗi, `api` không khởi động | `docker compose logs migrate`; lỗi xác thực thường do `POSTGRES_PASSWORD` bị đổi sau khi volume đã được tạo (xem dòng cuối bảng) |
| `api` unhealthy, log báo "Biến môi trường không hợp lệ" | sửa `.env` theo dòng báo lỗi, rồi `docker compose up -d --wait` |
| Trình duyệt báo lỗi chứng chỉ, log `web` báo không lấy được chứng chỉ | tên miền chưa trỏ đúng IP (`getent hosts <tên miền>`) hoặc cổng 80/443 bị chặn ở tường lửa của nhà cung cấp VPS |
| Đăng nhập được nhưng mọi thao tác lưu báo 403 | `PUBLIC_URL` phải trùng đúng địa chỉ trên thanh địa chỉ (`https://`, không có `/` cuối) |
| Đăng nhập xong bị đăng xuất ngay | đang mở bằng HTTP trong khi `COOKIE_SECURE=true`: dùng HTTPS |
| Build bị dừng giữa chừng, log báo `Killed` | server thiếu RAM: tạo swap 2 GB (`sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`, thêm `/swapfile none swap sw 0 0` vào `/etc/fstab`) |
| Đổi `POSTGRES_PASSWORD` trong `.env` nhưng API không kết nối được | PostgreSQL chỉ đọc biến này lần đầu tạo volume. Đổi cả trong DB: `docker compose exec db psql -U jpvocab -c "ALTER USER jpvocab PASSWORD '<mật khẩu mới>'"`, rồi `docker compose up -d --wait` |
