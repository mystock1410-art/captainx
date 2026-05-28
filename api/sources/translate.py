"""Google Translate unofficial endpoint — EN→VI with persistent per-item cache."""
from __future__ import annotations
import asyncio
import urllib.parse
from .http import client

TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"

# id -> {title_vi, summary_vi}. Survives process lifetime; lost on restart but
# we re-translate quickly and Google Translate caches identical inputs anyway.
_trans_cache: dict[str, dict[str, str]] = {}
_lock = asyncio.Lock()


async def _translate_one(text: str) -> str:
    """Translate a single English string to Vietnamese. Returns original on failure."""
    if not text:
        return text
    text = text[:5000]  # endpoint limit
    params = {
        "client": "gtx",
        "sl": "en",
        "tl": "vi",
        "dt": "t",
        "q": text,
    }
    try:
        r = await client().get(TRANSLATE_URL, params=params, timeout=15.0)
        r.raise_for_status()
        data = r.json()
        # Response shape: [[ [translated, original, ...], [translated2, ...], ... ], ...]
        if not isinstance(data, list) or not data or not data[0]:
            return text
        parts = [seg[0] for seg in data[0] if isinstance(seg, list) and seg and isinstance(seg[0], str)]
        return "".join(parts).strip() or text
    except Exception:
        return text


async def translate_items(items: list[dict]) -> list[dict]:
    """Add `title_vi` and `summary_vi` to each item, cached by item id."""
    # Find items needing translation
    todo: list[tuple[int, str, str]] = []  # (index, title, summary)
    for i, it in enumerate(items):
        cached = _trans_cache.get(it["id"])
        if cached:
            it["title_vi"] = cached.get("title_vi") or it.get("title", "")
            it["summary_vi"] = cached.get("summary_vi") or it.get("summary", "")
        else:
            todo.append((i, it.get("title") or "", it.get("summary") or ""))

    if not todo:
        return items

    async def _do(idx: int, title: str, summary: str):
        # Limit concurrency: translate title + summary sequentially per item
        t_vi = await _translate_one(title)
        s_vi = await _translate_one(summary) if summary else ""
        return idx, t_vi, s_vi

    # Batch with limited concurrency to avoid rate-limit
    sem = asyncio.Semaphore(6)

    async def _bounded(idx: int, t: str, s: str):
        async with sem:
            return await _do(idx, t, s)

    results = await asyncio.gather(*(_bounded(i, t, s) for i, t, s in todo))

    async with _lock:
        for idx, t_vi, s_vi in results:
            item = items[idx]
            item["title_vi"] = t_vi
            item["summary_vi"] = s_vi
            _trans_cache[item["id"]] = {"title_vi": t_vi, "summary_vi": s_vi}

    # Soft cap on cache size
    if len(_trans_cache) > 5000:
        for k in list(_trans_cache.keys())[: len(_trans_cache) - 4000]:
            _trans_cache.pop(k, None)

    return items
