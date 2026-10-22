#!/usr/bin/env bash
# Deploy bản mới lên server. Chạy bằng tài khoản có quyền dùng Docker, từ bất kỳ thư mục nào:
#   /opt/jpvocab/deploy/deploy.sh
# Dừng ngay nếu một bước lỗi; container cũ vẫn chạy cho tới khi image mới build xong.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "==> 1/3 Kéo code mới"
git pull --ff-only

echo "==> 2/3 Build image, chạy migration, khởi động lại (chờ tới khi mọi container khỏe)"
# --wait: lỗi nếu migration thất bại hoặc API không qua được healthcheck.
docker compose up -d --build --wait

echo "==> 3/3 Dọn image cũ"
docker image prune -f > /dev/null

docker compose ps
echo "Xong."
