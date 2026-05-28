"""SSI iBoard chart history — intraday/daily OHLC for VN tickers + VNINDEX."""
from __future__ import annotations
import time
from .http import client

CHART_URL = "https://iboard-api.ssi.com.vn/statistics/charts/history"


async def get_chart(
    symbol: str, resolution: str = "5", lookback_seconds: int = 86_400
) -> dict:
    """Return {t,o,h,l,c,v} arrays for `symbol` over the lookback window.

    resolution: "1" | "5" | "15" | "30" | "60" | "1D"
    """
    now = int(time.time())
    frm = now - lookback_seconds
    r = await client().get(
        CHART_URL,
        params={"resolution": resolution, "symbol": symbol.upper(), "from": frm, "to": now},
    )
    r.raise_for_status()
    payload = r.json()
    data = payload.get("data") or {}
    return {
        "symbol": symbol.upper(),
        "resolution": resolution,
        "t": data.get("t") or [],
        "o": data.get("o") or [],
        "h": data.get("h") or [],
        "l": data.get("l") or [],
        "c": data.get("c") or [],
        "v": data.get("v") or [],
    }
