#!/usr/bin/env bash
# One-shot deploy on the VPS: pull latest code, install, build, (re)start PM2.
#   cd /www/wwwroot/captainx && ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "▶ Pulling latest…";  git pull origin main
echo "▶ Installing…";      npm ci
echo "▶ Building…";        npm run build
echo "▶ (Re)starting PM2…"; pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
echo "✓ Deployed. Logs: pm2 logs captainx"
