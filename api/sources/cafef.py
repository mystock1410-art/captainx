"""Cafef PriceHistory — daily snapshot quotes for VN tickers and VNINDEX."""
from __future__ import annotations
from .http import client

PRICE_HISTORY_URL = (
    "https://cafef.vn/du-lieu/Ajax/PageNew/DataHistory/PriceHistory.ashx"
    "?Symbol={symbol}&StartDate=&EndDate=&PageIndex=1&PageSize=2"
)


async def get_snapshot(symbol: str) -> dict | None:
    """Return latest daily snapshot for `symbol` as
    {symbol, price, change, changePct, prev}, or None if unavailable."""
    url = PRICE_HISTORY_URL.format(symbol=symbol.upper())
    r = await client().get(url)
    r.raise_for_status()
    payload = r.json()
    rows = (payload.get("Data") or {}).get("Data") or []
    if not rows:
        return None

    latest = rows[0]
    price = float(latest.get("GiaDongCua") or 0)
    if price == 0:
        return None

    if len(rows) >= 2:
        prev = float(rows[1].get("GiaDongCua") or 0)
    else:
        prev = price

    change = round(price - prev, 4) if prev else 0.0
    change_pct = round(change / prev * 100, 4) if prev else 0.0

    return {
        "symbol": symbol.upper(),
        "price": round(price, 4),
        "change": change,
        "changePct": change_pct,
        "prev": round(prev, 4),
        "date": latest.get("Ngay"),
    }


async def get_snapshots(symbols: list[str]) -> list[dict]:
    """Fetch many snapshots in parallel."""
    import asyncio
    results = await asyncio.gather(
        *(get_snapshot(s) for s in symbols), return_exceptions=True
    )
    out: list[dict] = []
    for s, r in zip(symbols, results):
        if isinstance(r, Exception) or r is None:
            out.append({
                "symbol": s.upper(),
                "price": None,
                "change": None,
                "changePct": None,
                "error": str(r) if isinstance(r, Exception) else "no-data",
            })
        else:
            out.append(r)
    return out
