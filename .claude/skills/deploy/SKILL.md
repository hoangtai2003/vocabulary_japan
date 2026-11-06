---
name: deploy
description: Hướng dẫn deploy và vận hành jpvocab trên server production (Docker Compose, sau Caddy của dự án E-commerce). Chỉ dùng khi người dùng yêu cầu deploy, seed production, tạo admin production, hoặc xử lý sự cố server.
disable-model-invocation: true
---

# Deploy production

Hướng dẫn đầy đủ: `DEPLOY.md` ở gốc repo. Hướng dẫn người dùng **từng bước, bằng tiếng Việt**. Mình không có quyền SSH vào server: đưa lệnh cho người dùng tự chạy, rồi đọc kết quả họ gửi lại.

## Server hiện tại

- Thư mục `/opt/jpvocab`, server yếu: 1 CPU, ~950 MB RAM, có swap. Build đầy đủ mất khoảng 17 phút; báo trước cho người dùng.
- Chưa có tên miền: chạy ở `https://tuvung.<IP-server>.sslip.io`.
- Cổng 80/443 do Caddy của dự án E-commerce (`/root/E-commerce`, container `e-commerce-frontend-1`) giữ. jpvocab chạy theo mục "Server đã có proxy" trong DEPLOY.md: `.env` có `COMPOSE_FILE=docker-compose.yml:deploy/compose.behind-proxy.yml`, container `web` không mở cổng, nối mạng `web-proxy` với tên `jpvocab-web`.
- Phía E-commerce: `docker-compose.override.yml` + `Caddyfile.shared` (gắn đè Caddyfile trong image) có khối `reverse_proxy jpvocab-web:80`. Nếu Caddyfile gốc của E-commerce đổi thì `Caddyfile.shared` cũng phải cập nhật.
- Người dùng đã chọn **không sao lưu DB**.

## Lệnh thường dùng (chạy trong `/opt/jpvocab`)

```bash
/opt/jpvocab/deploy/deploy.sh                    # deploy bản mới: git pull, build, migrate, thay container
docker compose ps                                # trạng thái
docker compose logs --tail 200 api               # log API
docker compose exec api node prisma/seed.ts      # thêm từ vựng, dạng mondai còn thiếu (không tạo tài khoản mẫu)
```

Tạo admin (mật khẩu nhập ẩn, không để lộ trong lịch sử lệnh hay trong khung chat):

```bash
read -s -p "Mật khẩu admin: " ADMIN_PW; echo
docker compose exec api node src/scripts/create-admin.ts --email <email> --password "$ADMIN_PW" --name 'Quản trị viên'
unset ADMIN_PW
```

## Cấm

- **Không bao giờ** `docker compose down -v` trên server: xóa volume `db-data` (toàn bộ DB) và `uploads` (ảnh đề thi).
- Không thêm `ports:` cho `db` hay `api` (Docker vượt qua ufw).
- Không đụng vào container, file của dự án E-commerce khi người dùng chưa đồng ý rõ.
- Không đưa nội dung `.env`, mật khẩu vào chat hay vào git.

## Khi có sự cố

Tra bảng "Khắc phục sự cố" trong `DEPLOY.md` trước. Hỏi người dùng gửi `docker compose ps` và log của service lỗi, không đoán.
