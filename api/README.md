---
title: Captain X API
emoji: 📊
colorFrom: red
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
short_description: Vietnamese stock market data + news + AI brief
---

# Captain X — Backend API

FastAPI proxy + cache for Vietnamese equity market dashboard.

## Endpoints

- `GET /api/health` — health check
- `GET /api/quotes?symbols=HAG,MWG,…` — VN ticker snapshots (Cafef)
- `GET /api/chart/{vnindex|dji|wti|ym}` — chart data
- `GET /api/news` — VN long-form news (Cafef, Vietstock, Vietnambiz)
- `GET /api/headlines` — VN flash + FireAnt aggregator
- `GET /api/news-en` — international news translated to Vietnamese
- `GET /api/headlines-en` — international flash translated to Vietnamese
- `GET /api/market-brief` — AI market analysis (Claude Opus 4.7)

## Secrets (configure in Space settings → Variables and secrets)

| Name | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Get a key at https://console.anthropic.com/settings/keys (new accounts get $5 free credit) |
| `CORS_ORIGINS` | yes | CSV of allowed frontend origins, e.g. `https://captainx.vercel.app` |
| `FIREANT_TOKEN` | no | Override the default public FireAnt token if needed |

Frontend repo: https://github.com/&lt;you&gt;/captainx (Vercel deploy).
