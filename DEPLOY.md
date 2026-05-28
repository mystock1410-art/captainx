# Deploy Captain X

End-to-end checklist for first production deploy. Estimate 30–45 phút.

## 0. Prerequisites

Đăng ký 3 account (đều free tier):

- [ ] **Fly.io** — https://fly.io/sign-up (cần verify card, không charge nếu giữ free)
- [ ] **Vercel** — https://vercel.com/signup (Hobby plan free)
- [ ] **Upstash Redis** — https://upstash.com (Free tier 10k commands/day)
- [ ] **GitHub** — đã có

Cài CLI:

```powershell
# Fly CLI
iwr https://fly.io/install.ps1 -useb | iex

# Vercel CLI (optional — có thể deploy qua dashboard)
npm i -g vercel
```

## 1. Push code lên GitHub

```powershell
cd "f:\OCBS\Platform news AI"
git add .
git commit -m "Initial Captain X scaffold (Phase 1-2)"
# Tạo repo trên github.com/new — tên `captainx`, để Private
git remote add origin https://github.com/<YOUR_USER>/captainx.git
git push -u origin main
```

## 2. Tạo Upstash Redis database

1. Vào https://console.upstash.com → **Create Database**
2. Name: `captainx-cache`, region: `ap-southeast-1` (Singapore)
3. Sau khi tạo, copy giá trị **`UPSTASH_REDIS_REST_URL`** dưới dạng `rediss://...` (lưu ý prefix `rediss` với 2 chữ s — đây là TLS).
   - Nếu trang chỉ hiện REST URL, vào tab **"Details"** hoặc **"Connect"** để xem dạng `rediss://default:<token>@<host>:6379`.

## 3. Deploy backend lên Fly.io

```powershell
cd "f:\OCBS\Platform news AI\api"
fly auth login
fly launch --no-deploy --copy-config --name captainx-api --region sin
# Khi hỏi "Would you like to set up..." trả lời:
#   - Postgres: N
#   - Redis: N (mình dùng Upstash)
#   - Tweak settings: N

# Set secrets
fly secrets set REDIS_URL="rediss://default:<TOKEN>@<HOST>:6379"
fly secrets set CORS_ORIGINS="https://captainx.vercel.app,https://<custom-domain-nếu-có>"

# Deploy
fly deploy

# Verify
fly status
curl https://captainx-api.fly.dev/api/health
curl "https://captainx-api.fly.dev/api/quotes?symbols=HAG,MWG"
```

## 4. Deploy frontend lên Vercel

**Cách 1 — Dashboard (recommended)**

1. https://vercel.com/new → import repo `captainx`
2. **Root Directory**: `web` (quan trọng — repo có cả `api/` và `web/`)
3. Framework Preset: Next.js (auto)
4. Environment Variables:
   - `NEXT_PUBLIC_API_BASE` = `https://captainx-api.fly.dev`
5. Click **Deploy**

**Cách 2 — CLI**

```powershell
cd "f:\OCBS\Platform news AI\web"
vercel login
vercel link              # tạo project, chọn scope, project name
vercel env add NEXT_PUBLIC_API_BASE production
# (paste https://captainx-api.fly.dev)
vercel --prod
```

## 5. Cập nhật CORS sau khi biết Vercel URL

Lần đầu Vercel sẽ cấp URL kiểu `captainx-<hash>.vercel.app`. Nếu URL khác `captainx.vercel.app`:

```powershell
cd "f:\OCBS\Platform news AI\api"
fly secrets set CORS_ORIGINS="https://<your-actual-vercel-url>.vercel.app"
# Fly tự restart machine sau khi set secrets
```

## 6. Smoke test production

- [ ] https://<your>.vercel.app load OK
- [ ] Ticker bar hiện giá thật (mở DevTools → Network → check call tới `captainx-api.fly.dev/api/quotes`)
- [ ] 4 chart cards có data
- [ ] News + Headlines load
- [ ] Theme toggle giữ được sau reload
- [ ] Watchlist edit + reload vẫn nhớ

## 7. (Optional) Custom domain

**Vercel**: Project → Settings → Domains → Add `captainx.com` (hoặc tên bạn chọn). Vercel hướng dẫn DNS records.

**Fly.io**: API có thể đặt sau `api.captainx.com`:
```powershell
fly certs add api.captainx.com
# Thêm CNAME api → captainx-api.fly.dev tại registrar
```

Sau đó update `CORS_ORIGINS` thêm domain mới và `NEXT_PUBLIC_API_BASE` trong Vercel.

## Troubleshooting

| Triệu chứng | Cách xử lý |
|---|---|
| Frontend gọi API bị CORS block | `fly secrets set CORS_ORIGINS="https://<exact-vercel-url>"` rồi `fly deploy` |
| Fly machine cold start chậm | Sửa `min_machines_running = 1` trong `fly.toml` (sẽ tính phí 24/7) |
| Redis lỗi `Connection refused` | URL phải là `rediss://` (TLS) cho Upstash, không phải `redis://` |
| Vercel build fail | Đảm bảo Root Directory = `web`, Node version ≥ 20 |
| Chart VNINDEX trống ngoài giờ giao dịch | Bình thường — backend đã set lookback 3 ngày; nếu vẫn trống, kiểm tra `fly logs` |

## Chi phí dự kiến

| Thành phần | Free tier | Khi vượt |
|---|---|---|
| Vercel Hobby | 100 GB bandwidth/tháng | $20/tháng Pro |
| Fly.io | $5 credit/tháng (≈ 1 shared-cpu-1x 256MB) | $1.94/tháng cho machine + bandwidth |
| Upstash Redis | 10k commands/day, 256MB | $0.20 per 100k commands |

Với traffic cá nhân / demo, tổng chi phí gần như **$0**.
