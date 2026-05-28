# Captain X

Bảng theo dõi thị trường chứng khoán Việt Nam realtime — watchlist editable, chart VNINDEX + DJI + WTI + DJ Futures, tin tức RSS từ Cafef/Vietstock/Vietnambiz/VnExpress/24h.

## Cấu trúc

```
web/   Next.js 16 + Tailwind v4 + Lightweight Charts (frontend)
api/   FastAPI proxy + in-memory TTL cache (backend)
```

## Chạy local

**Backend (cổng 8000):**
```powershell
cd api
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend (cổng 3000):**
```powershell
cd web
npm run dev
```

Mở http://localhost:3000.

## Endpoints API

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/quotes?symbols=HAG,MWG,...` | Snapshot giá (Cafef) |
| GET | `/api/chart/{slot}` | Chart `vnindex` (SSI iBoard) / `dji`, `wti`, `ym` (Yahoo Finance) |
| GET | `/api/news` | Tin dài: Cafef · Vietstock · Vietnambiz (RSS) |
| GET | `/api/headlines` | Tin nhanh: VnExpress · 24h (RSS) |

## Nguồn dữ liệu

- **VN equity snapshots** — Cafef PriceHistory (`cafef.vn/du-lieu/...`)
- **VN intraday/historical charts** — SSI iBoard (`iboard-api.ssi.com.vn`)
- **Global indices/futures** — Yahoo Finance public chart endpoint
- **VN news RSS** — Cafef, Vietstock, Vietnambiz, VnExpress, 24h
