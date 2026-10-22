#!/usr/bin/env bash
# Deploy bản mới lên server (prompt backend mục 10.2). Chạy bằng tài khoản quản trị có sudo,
# từ bất kỳ thư mục nào:   bash /home/jpvocab/app/vocabulary_japan_be/deploy/deploy.sh
# Code, build và migration chạy dưới user jpvocab (không có sudo); chỉ bước khởi động lại service
# và chép frontend vào /var/www cần sudo. Dừng ngay nếu một bước lỗi.
set -euo pipefail

APP_USER=jpvocab
APP_DIR=/home/jpvocab/app
BACKEND_DIR="$APP_DIR/vocabulary_japan_be"
FRONTEND_DIR="$APP_DIR/vocabulary_japan_fe"
WEB_ROOT=/var/www/jpvocab
ENV_FILE=/etc/jpvocab/api.env
SERVICE=jpvocab-api

# Chạy lệnh dưới user ứng dụng.
as_app() { sudo -u "$APP_USER" -H bash -c "set -euo pipefail; $1"; }
# Như trên nhưng nạp biến môi trường production (cần DATABASE_URL cho migration).
as_app_env() { sudo -u "$APP_USER" -H bash -c "set -euo pipefail; set -a; source '$ENV_FILE'; set +a; $1"; }

echo "==> 1/7 Kéo code mới"
as_app "git -C '$APP_DIR' pull --ff-only"

echo "==> 2/7 Backend: cài gói (kèm devDependencies để build), build"
# --include=dev: NODE_ENV=production không được làm npm bỏ qua TypeScript, tsx, Prisma CLI.
as_app "cd '$BACKEND_DIR' && npm ci --include=dev && npm run build"

echo "==> 3/7 Migration database"
as_app_env "cd '$BACKEND_DIR' && npx prisma migrate deploy"

echo "==> 4/7 Khởi động lại API"
sudo systemctl restart "$SERVICE"

echo "==> 5/7 Chờ API sẵn sàng"
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4000/api/health > /dev/null; then
    echo "    API đã chạy (lần thử $attempt)."
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "API không phản hồi sau 30 giây. Xem log: journalctl -u $SERVICE -n 100" >&2
    exit 1
  fi
  sleep 1
done

echo "==> 6/7 Frontend: build chế độ real, gọi API cùng domain"
# Không nạp api.env cho frontend: bản build chỉ cần hai biến VITE_ dưới đây.
as_app "cd '$FRONTEND_DIR' && npm ci --include=dev && VITE_API_MODE=real VITE_API_URL= npm run build"

echo "==> 7/7 Chép frontend vào $WEB_ROOT"
sudo rsync -a --delete "$FRONTEND_DIR/dist/" "$WEB_ROOT/"
sudo chown -R root:root "$WEB_ROOT"

echo "Xong. Kiểm tra: curl -fsS https://<tên miền>/api/health"
