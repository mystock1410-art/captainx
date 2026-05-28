"""RSS news feeds from VN sources, parsed with feedparser."""
from __future__ import annotations
import asyncio
import hashlib
import html
import re
import time
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone
import feedparser  # type: ignore

from .http import client

# (source label, url)
LIVE_FEEDS: list[tuple[str, str]] = [
    ("Cafef", "https://cafef.vn/thi-truong-chung-khoan.rss"),
    ("Cafef", "https://cafef.vn/tai-chinh-ngan-hang.rss"),
    ("Vietstock", "https://vietstock.vn/830/chung-khoan/co-phieu.rss"),
    ("Vietnambiz", "https://vietnambiz.vn/rss/chung-khoan.rss"),
]

HEADLINE_FEEDS: list[tuple[str, str]] = [
    ("VnExpress", "https://vnexpress.net/rss/kinh-doanh.rss"),
    ("VnExpress", "https://vnexpress.net/rss/chung-khoan.rss"),
]

# English-language sources (auto-translated to VI before serving)
LIVE_FEEDS_EN: list[tuple[str, str]] = [
    ("AJ", "https://www.aljazeera.com/xml/rss/all.xml"),
    ("CNN", "http://rss.cnn.com/rss/edition.rss"),
    ("CNN", "http://rss.cnn.com/rss/cnn_world.rss"),
    ("WSJ", "https://feeds.a.dj.com/rss/RSSWorldNews.xml"),
    ("WSJ", "https://feeds.a.dj.com/rss/RSSMarketsMain.xml"),
]

HEADLINE_FEEDS_EN: list[tuple[str, str]] = [
    ("MKT", "https://feeds.marketwatch.com/marketwatch/topstories/"),
    ("MKT", "https://feeds.marketwatch.com/marketwatch/realtimeheadlines/"),
    ("INV", "https://www.investing.com/rss/news.rss"),
]

_HTML_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")

# Keywords that flag an item as "important" or "breaking"
_BREAKING_KEYWORDS = (
    "khẩn", "nóng", "vừa", "breaking", "cấp tốc",
    "công bố", "tăng trần", "giảm sàn", "hủy niêm yết",
)
_IMPORTANT_KEYWORDS = (
    "fed", "nhnn", "lãi suất", "tỷ giá", "lạm phát",
    "gdp", "cpi", "ngân hàng nhà nước", "thủ tướng",
    "trái phiếu", "thuế", "fomc", "ecb", "boj",
    "vn-index", "vn30", "hose", "ssc", "uỷ ban chứng khoán",
    "phát hành", "cổ tức", "chia tách", "esop",
    "đáo hạn", "phái sinh", "khối ngoại",
)


def _classify(text: str) -> tuple[bool, bool]:
    """Return (breaking, important) based on lowercase keyword match."""
    lower = text.lower()
    breaking = any(k in lower for k in _BREAKING_KEYWORDS)
    important = breaking or any(k in lower for k in _IMPORTANT_KEYWORDS)
    return breaking, important


def _strip_html(s: str | None) -> str:
    if not s:
        return ""
    # Decode &#225; → á, &amp; → & etc. before stripping tags.
    decoded = html.unescape(s)
    return _WS_RE.sub(" ", _HTML_RE.sub("", decoded)).strip()


def _to_iso(entry: dict) -> str | None:
    for key in ("published", "updated", "pubDate"):
        raw = entry.get(key)
        if not raw:
            continue
        try:
            dt = parsedate_to_datetime(raw)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat()
        except Exception:
            continue
    # fallback: feedparser struct_time
    for key in ("published_parsed", "updated_parsed"):
        st = entry.get(key)
        if st:
            try:
                return datetime.fromtimestamp(time.mktime(st), tz=timezone.utc).isoformat()
            except Exception:
                pass
    return None


def _item_id(source: str, link: str | None, title: str | None) -> str:
    base = f"{source}|{link or ''}|{title or ''}".encode("utf-8")
    return hashlib.sha1(base).hexdigest()[:16]


async def _fetch_one(source: str, url: str) -> list[dict]:
    try:
        r = await client().get(url, timeout=10.0)
        r.raise_for_status()
    except Exception:
        return []
    parsed = feedparser.parse(r.content)
    items: list[dict] = []
    for entry in parsed.entries:
        title = _strip_html(entry.get("title"))
        if not title:
            continue
        link = entry.get("link") or ""
        summary = _strip_html(entry.get("summary") or entry.get("description"))
        published = _to_iso(entry)
        breaking, important = _classify(title + " " + summary)
        items.append({
            "id": _item_id(source, link, title),
            "source": source,
            "title": title,
            "summary": summary,
            "link": link,
            "published": published,
            "breaking": breaking,
            "important": important,
        })
    return items


def _merge_sorted(buckets: list[list[dict]], limit: int) -> list[dict]:
    seen: set[str] = set()
    merged: list[dict] = []
    for bucket in buckets:
        for item in bucket:
            if item["id"] in seen:
                continue
            seen.add(item["id"])
            merged.append(item)
    merged.sort(key=lambda x: x.get("published") or "", reverse=True)
    return merged[:limit]


async def get_live_feed(limit: int = 40) -> list[dict]:
    buckets = await asyncio.gather(*(_fetch_one(s, u) for s, u in LIVE_FEEDS))
    return _merge_sorted(list(buckets), limit)


async def get_headlines(limit: int = 50) -> list[dict]:
    buckets = await asyncio.gather(*(_fetch_one(s, u) for s, u in HEADLINE_FEEDS))
    return _merge_sorted(list(buckets), limit)


async def get_live_feed_en(limit: int = 30) -> list[dict]:
    buckets = await asyncio.gather(*(_fetch_one(s, u) for s, u in LIVE_FEEDS_EN))
    return _merge_sorted(list(buckets), limit)


async def get_headlines_en(limit: int = 40) -> list[dict]:
    buckets = await asyncio.gather(*(_fetch_one(s, u) for s, u in HEADLINE_FEEDS_EN))
    return _merge_sorted(list(buckets), limit)
