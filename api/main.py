"""Captain X backend — proxy + cache for VN market data and news."""
from __future__ import annotations
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Load .env if present so ANTHROPIC_API_KEY etc. is available locally.
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    import os as _os_env
    for line in _env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        _os_env.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from cache import cached
from sources import cafef, ssi, yahoo, rss, ai, fireant
from sources.translate import translate_items
from sources.http import close as close_http

# Maps frontend chart slot -> upstream symbol + fetcher
CHART_TARGETS: dict[str, dict] = {
    "vnindex": {"provider": "ssi", "symbol": "VNINDEX", "name": "VN-Index"},
    "dji": {"provider": "yahoo", "symbol": "^DJI", "name": "Dow Jones Industrial Average"},
    "wti": {"provider": "yahoo", "symbol": "CL=F", "name": "WTI Crude Oil Futures"},
    "ym": {"provider": "yahoo", "symbol": "YM=F", "name": "E-mini Dow Futures"},
}


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await close_http()


app = FastAPI(title="Captain X API", version="0.1.0", lifespan=lifespan)

import os as _os

_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
_origins = [o.strip() for o in _os.getenv("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"ok": True}


@app.get("/api/quotes")
async def quotes(symbols: str = Query(..., min_length=1, description="CSV of tickers")):
    syms = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not syms:
        raise HTTPException(400, "no symbols")
    syms = syms[:30]  # safety bound
    key = "quotes:" + ",".join(sorted(syms))
    return await cached(key, ttl=20, loader=lambda: cafef.get_snapshots(syms))


@app.get("/api/chart/{slot}")
async def chart(slot: str):
    target = CHART_TARGETS.get(slot.lower())
    if not target:
        raise HTTPException(404, f"unknown chart slot '{slot}'")

    async def load() -> dict:
        if target["provider"] == "ssi":
            ch = await ssi.get_chart(target["symbol"], resolution="5", lookback_seconds=259_200)
            snap = await cafef.get_snapshot(target["symbol"])
            return {
                "slot": slot,
                "name": target["name"],
                "symbol": target["symbol"],
                "price": (snap or {}).get("price"),
                "change": (snap or {}).get("change"),
                "changePct": (snap or {}).get("changePct"),
                "t": ch["t"],
                "c": ch["c"],
            }
        # yahoo
        y = await yahoo.get_chart(target["symbol"], range_="1d", interval="5m")
        return {
            "slot": slot,
            "name": target["name"],
            "symbol": target["symbol"],
            "price": y["price"],
            "change": y["change"],
            "changePct": y["changePct"],
            "t": y["t"],
            "c": y["c"],
        }

    return await cached(f"chart:{slot}", ttl=30, loader=load)


@app.get("/api/news")
async def news():
    return await cached("news:live", ttl=90, loader=lambda: rss.get_live_feed(limit=40))


async def _load_headlines():
    import asyncio as _aio
    rss_items, fa_items = await _aio.gather(
        rss.get_headlines(limit=40),
        fireant.get_posts(limit=30),
        return_exceptions=False,
    )
    merged = list(rss_items) + list(fa_items)
    merged.sort(key=lambda x: x.get("published") or "", reverse=True)
    return merged[:60]


@app.get("/api/headlines")
async def headlines():
    return await cached("news:headlines", ttl=90, loader=_load_headlines)


async def _load_news_en():
    items = await rss.get_live_feed_en(limit=30)
    return await translate_items(items)


async def _load_headlines_en():
    items = await rss.get_headlines_en(limit=40)
    return await translate_items(items)


@app.get("/api/news-en")
async def news_en():
    return await cached("news:live-en", ttl=180, loader=_load_news_en)


@app.get("/api/headlines-en")
async def headlines_en():
    return await cached("news:headlines-en", ttl=180, loader=_load_headlines_en)


DEFAULT_WATCHLIST = ["HAG", "MWG", "OCB", "SSI", "VIC", "VHM", "KDH"]


async def _load_market_brief(symbols_csv: str):
    syms = [s.strip().upper() for s in symbols_csv.split(",") if s.strip()][:15] or DEFAULT_WATCHLIST

    async def _vn_news():
        return await rss.get_live_feed(limit=24)

    async def _en_news():
        items = await rss.get_live_feed_en(limit=15)
        return await translate_items(items)

    async def _vnindex():
        from sources.ssi import get_chart as ssi_chart
        snap = await cafef.get_snapshot("VNINDEX")
        return snap

    async def _quotes():
        return await cafef.get_snapshots(syms)

    import asyncio
    vnindex_snap, watchlist_q, vn_n, en_n = await asyncio.gather(
        _vnindex(), _quotes(), _vn_news(), _en_news()
    )
    return await ai.generate_market_brief(vnindex_snap, watchlist_q, vn_n, en_n)


@app.get("/api/market-brief")
async def market_brief(symbols: str = "", nocache: int = 0):
    key = "ai:brief:" + (",".join(sorted({s.strip().upper() for s in symbols.split(",") if s.strip()})) or "default")
    if nocache:
        result = await _load_market_brief(symbols)
        # only cache successful results
        if result.get("model"):
            from cache import _mem  # type: ignore
            import time as _t
            _mem[key] = (_t.monotonic() + 900, result)
        return result

    async def _wrapped():
        result = await _load_market_brief(symbols)
        if not result.get("model"):
            # don't poison cache with errors — bail with TTL 0
            raise _NoCacheError(result)
        return result

    try:
        return await cached(key, ttl=900, loader=_wrapped)
    except _NoCacheError as e:
        return e.payload


class _NoCacheError(Exception):
    def __init__(self, payload: dict):
        super().__init__("skip cache")
        self.payload = payload
