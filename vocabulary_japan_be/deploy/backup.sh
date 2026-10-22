#!/usr/bin/env bash
# Sao lưu database mỗi đêm (prompt backend mục 10.2), giữ 14 bản gần nhất.
# Chạy dưới user hệ thống postgres (xác thực peer, không cần mật khẩu). Cài:
#   sudo install -m 755 deploy/backup.sh /usr/local/bin/jpvocab-backup
#   sudo install -d -o postgres -g postgres -m 700 /var/backups/jpvocab
#   sudo cp deploy/jpvocab-backup.cron /etc/cron.d/jpvocab-backup
# Khôi phục: xem DEPLOY.md, mục "Sao lưu và khôi phục".
set -euo pipefail

DB_NAME="${DB_NAME:-jpvocab}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/jpvocab}"
KEEP="${KEEP:-14}"

timestamp="$(date +%Y%m%d-%H%M%S)"
target="$BACKUP_DIR/$DB_NAME-$timestamp.dump"

# Ghi ra file tạm rồi đổi tên: một bản sao lưu dở dang không bao giờ trông như bản hoàn chỉnh.
pg_dump --format=custom --file="$target.partial" "$DB_NAME"
mv "$target.partial" "$target"

# Giữ $KEEP bản mới nhất, xóa phần còn lại.
ls -1t "$BACKUP_DIR"/"$DB_NAME"-*.dump | tail -n +"$((KEEP + 1))" | xargs -r rm -f --

echo "Đã sao lưu $DB_NAME vào $target"
