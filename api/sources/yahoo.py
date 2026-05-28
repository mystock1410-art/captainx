"""Yahoo Finance chart endpoint — for global indices/futures (DJI, WTI, YM)."""
from __future__ import annotations
from .http import client

CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"


async def get_chart(symbol: str, range_: str = "1d", interval: str = "5m") -> dict:
    """Return normalized chart + quote summary for a Yahoo symbol.

    Examples: '^DJI', 'CL=F' (WTI futures), 'YM=F' (DJ futures).
    """
    r = await client().get(
        CHART_URL.format(symbol=symbol),
        params={"range": range_, "interval": interval},
    )
    r.raise_for_status()
    payload = r.json()
    results = (payload.get("chart") or {}).get("result") or []
    if not results:
        return _empty(symbol)
    res = results[0]
    meta = res.get("meta") or {}
    ts: list[int] = res.get("timestamp") or []
    quote = ((res.get("indicators") or {}).get("quote") or [{}])[0]

    closes = quote.get("close") or []
    opens = quote.get("open") or []
    highs = quote.get("high") or []
    lows = quote.get("low") or []

    price = meta.get("regularMarketPrice")
    prev_close = meta.get("chartPreviousClose") or meta.get("previousClose")
    change = round(price - prev_close, 4) if price is not None and prev_close else None
    change_pct = (
        round(change / prev_close * 100, 4)
        if change is not None and prev_close
        else None
    )

    # filter out null candles
    pairs = [(t, c) for t, c in zip(ts, closes) if c is not None]
    t_clean = [p[0] for p in pairs]
    c_clean = [round(p[1], 4) for p in pairs]

    return {
        "symbol": symbol,
        "name": meta.get("shortName") or meta.get("longName") or symbol,
        "price": round(price, 4) if price is not None else None,
        "prev": round(prev_close, 4) if prev_close else None,
        "change": change,
        "changePct": change_pct,
        "currency": meta.get("currency"),
        "t": t_clean,
        "c": c_clean,
        "o": [round(v, 4) if v is not None else None for v in opens],
        "h": [round(v, 4) if v is not None else None for v in highs],
        "l": [round(v, 4) if v is not None else None for v in lows],
    }


def _empty(symbol: str) -> dict:
    return {
        "symbol": symbol,
        "name": symbol,
        "price": None,
        "prev": None,
        "change": None,
        "changePct": None,
        "currency": None,
        "t": [],
        "c": [],
        "o": [],
        "h": [],
        "l": [],
    }
