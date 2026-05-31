# Captain X

Bảng theo dõi thị trường chứng khoán Việt Nam realtime — chart VNINDEX/phái sinh + chỉ số thế giới, tin tức RSS đa nguồn (trong nước + quốc tế dịch sang tiếng Việt), và phân tích thị trường bằng AI (Claude Opus).

Ứng dụng **Next.js 16** tự chứa toàn bộ backend qua **API Routes** — không cần server riêng.

## Cấu trúc

```
src/app/          Pages (Home, Stock Analysis, Valuation, Asset Allocation, Copytrade, OCBS Products)
src/app/api/      API routes (quotes, chart, news, headlines, derivatives, market-brief, lead, world-quotes)
src/components/   UI components
src/lib/          Client helpers (api.ts) + src/lib/server/ (nguồn dữ liệu: cafef, ssi, yahoo, fireant, dnse, …)
public/           Ảnh tĩnh + public/logos/ (logo cổ phiếu)
_archive/         Backend FastAPI cũ + tài liệu/asset lỗi thời (local-only, không deploy)
```

## Chạy local

```powershell
npm install
npm run dev
```

Mở http://localhost:3000.

## Biến môi trường

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `ANTHROPIC_API_KEY` | có (cho market-brief) | Key tại https://console.anthropic.com/settings/keys |

Đặt trong `.env.local` (local) hoặc Vercel → Settings → Environment Variables (production).

## Endpoints

| Path | Mô tả |
|---|---|
| `GET /api/quotes?symbols=HAG,MWG,…` | Snapshot giá cổ phiếu VN |
| `GET /api/chart/{vnindex\|dji\|wti\|ym}` | Dữ liệu chart |
| `GET /api/derivatives` | Hợp đồng phái sinh |
| `GET /api/world-quotes` | Chỉ số/hàng hoá/FX thế giới |
| `GET /api/news` · `/api/headlines` | Tin trong nước (Cafef, Vietstock, Vietnambiz, VnExpress, FireAnt) |
| `GET /api/news-en` · `/api/headlines-en` | Tin quốc tế dịch sang tiếng Việt |
| `GET /api/market-brief` | Phân tích thị trường bằng Claude Opus |
| `GET /api/lead` | Thu thập lead |

## Deploy (Vercel)

Repo này **là** app Next.js (package.json ở gốc) nên **Root Directory = `./`**.

1. Vercel → import repo.
2. Settings → General → **Root Directory** = `./` (mặc định gốc — KHÔNG còn để `web`).
3. Settings → Environment Variables → thêm `ANTHROPIC_API_KEY`.
4. Settings → Domains → thêm custom domain, làm theo hướng dẫn DNS.
5. Deploy.

Framework preset: Next.js (tự nhận). Region: `sin1` (xem `vercel.json`).
