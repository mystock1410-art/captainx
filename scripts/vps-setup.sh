#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Captain X — VPS bootstrap (AlmaLinux + aaPanel). Chạy MỘT lệnh sau khi clone:
#
#   cd /www/wwwroot/captainx && bash scripts/vps-setup.sh
#
# Script tự: Node 20 (nếu thiếu) · tạo .env.local · MySQL DB+user+bảng ·
#            npm ci + build · PM2 chạy :3000 · cron collector.
# Còn lại (web UI): aaPanel reverse-proxy + SSL · đổi DNS · gỡ Vercel.
# Idempotent — chạy lại nhiều lần an toàn.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"
echo "▶ App dir: $APP_DIR"

getenv() { [ -f .env.local ] && grep -E "^$1=" .env.local | head -1 | cut -d= -f2- || true; }

# 1) Node ≥ 20 (qua nvm nếu cần) ───────────────────────────────────────────────
node_major() { command -v node >/dev/null 2>&1 && node -v | sed 's/v\([0-9]*\).*/\1/' || echo 0; }
if [ "$(node_major)" -lt 20 ]; then
  echo "▶ Cài Node 20 qua nvm…"
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] || curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm install 20 >/dev/null && nvm use 20 >/dev/null
fi
echo "▶ Node $(node -v) · npm $(npm -v)"

# 2) .env.local ────────────────────────────────────────────────────────────────
if [ ! -f .env.local ]; then
  echo "▶ Tạo .env.local"
  read -rp "   ANTHROPIC_API_KEY (Enter bỏ qua, điền sau): " ANTHROPIC || true
  read -rp "   DB name [captainx]: " DBN; DBN=${DBN:-captainx}
  read -rp "   DB user [captainx]: " DBU; DBU=${DBU:-captainx}
  read -rsp "   DB password cho '$DBU': " DBP; echo
  CRON_SECRET=$(openssl rand -hex 24)
  umask 177
  cat > .env.local <<EOF
ANTHROPIC_API_KEY=${ANTHROPIC:-}
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DBU}
DB_PASS=${DBP}
DB_NAME=${DBN}
CRON_SECRET=${CRON_SECRET}
EOF
  umask 022
  echo "   ✓ .env.local tạo xong (CRON_SECRET đã sinh tự động)."
else
  echo "▶ .env.local đã có — giữ nguyên."
fi
DB_NAME=$(getenv DB_NAME); DB_USER=$(getenv DB_USER); DB_PASS=$(getenv DB_PASS); CRON_SECRET=$(getenv CRON_SECRET)

# 3) MySQL: DB + user + bảng ────────────────────────────────────────────────────
read -rp "▶ Thiết lập MySQL '$DB_NAME' bây giờ? [y/N]: " DOSQL || true
if [[ "${DOSQL,,}" == "y" ]]; then
  read -rsp "   MySQL root password (aaPanel → Databases → root): " MYROOT; echo
  mysql -uroot -p"$MYROOT" <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
  mysql -uroot -p"$MYROOT" "$DB_NAME" < scripts/schema.sql
  echo "   ✓ DB + user + bảng (leads, market_snapshots) sẵn sàng."
fi

# 4) Build ──────────────────────────────────────────────────────────────────────
echo "▶ npm ci && build… (vài phút)"
npm ci
npm run build

# 5) PM2 ─────────────────────────────────────────────────────────────────────────
command -v pm2 >/dev/null 2>&1 || npm i -g pm2
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
echo "▶ Test nội bộ: $(curl -s 'localhost:3000/api/quotes?symbols=FPT' | head -c 90)…"

# 6) Cron collector ──────────────────────────────────────────────────────────────
read -rp "▶ Cài cron collector (mỗi 3' trong 9–14h, T2–T6)? [y/N]: " DOCRON || true
if [[ "${DOCRON,,}" == "y" ]]; then
  LINE="*/3 9-14 * * 1-5 curl -s -H \"x-cron-secret: ${CRON_SECRET}\" https://captainx.vn/api/internal/collect >/dev/null 2>&1"
  ( crontab -l 2>/dev/null | grep -v 'api/internal/collect' ; echo "$LINE" ) | crontab -
  echo "   ✓ Cron đã cài. (Giờ hệ thống nên là Asia/Ho_Chi_Minh — xem 'timedatectl'.)"
fi

cat <<DONE

✅ XONG phần tự động (Node · env · MySQL · build · PM2 · cron).
   App đang chạy ở http://127.0.0.1:3000

CÒN LẠI làm trên web UI (chỉ bạn làm được):
   1) aaPanel → Website → Add site 'captainx.vn' → Reverse proxy → http://127.0.0.1:3000
        thêm vào config:  proxy_read_timeout 70s;
   2) aaPanel → site → SSL → Let's Encrypt cho captainx.vn + www → Force HTTPS
   3) ZoneDNS: A 'captainx.vn' và 'www' → 103.101.160.64  (hạ TTL trước, test rồi đổi)
   4) Sau khi https://captainx.vn chạy OK → gỡ domain + project trên Vercel

   CRON_SECRET của bạn: ${CRON_SECRET}
   Deploy lần sau:      ./deploy.sh
DONE
