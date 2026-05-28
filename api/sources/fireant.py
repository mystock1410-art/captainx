"""FireAnt posts API — VN financial news aggregator.

Uses the public client-credentials Bearer token embedded in FireAnt's
`fireant.tradestation` SPA. Token has `posts-read` scope and expires
2029-11-17. Override via env `FIREANT_TOKEN` if needed."""
from __future__ import annotations
import hashlib
import html
import os
import re
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone

from .http import client

# Public client-credentials JWT from fireant.vn SPA — read-only, exp 2029-11-17.
PUBLIC_TOKEN = (
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IkdYdExONzViZlZQakdvNERWdjV4QkRITHpnSSIsImtpZCI6IkdYdExONzViZlZQakdvNERWdjV4QkRITHpnSSJ9."
    "eyJpc3MiOiJodHRwczovL2FjY291bnRzLmZpcmVhbnQudm4iLCJhdWQiOiJodHRwczovL2FjY291bnRzLmZpcmVhbnQudm4vcmVzb3VyY2VzIiwiZXhwIjoxODg5NjIyNTMwLCJuYmYiOjE1ODk2MjI1MzAsImNsaWVudF9pZCI6ImZpcmVhbnQudHJhZGVzdGF0aW9uIiwic2NvcGUiOlsiYWNhZGVteS1yZWFkIiwiYWNhZGVteS13cml0ZSIsImFjY291bnRzLXJlYWQiLCJhY2NvdW50cy13cml0ZSIsImJsb2ctcmVhZCIsImNvbXBhbmllcy1yZWFkIiwiZmluYW5jZS1yZWFkIiwiaW5kaXZpZHVhbHMtcmVhZCIsImludmVzdG9wZWRpYS1yZWFkIiwib3JkZXJzLXJlYWQiLCJvcmRlcnMtd3JpdGUiLCJwb3N0cy1yZWFkIiwicG9zdHMtd3JpdGUiLCJzZWFyY2giLCJzeW1ib2xzLXJlYWQiLCJ1c2VyLWRhdGEtcmVhZCIsInVzZXItZGF0YS13cml0ZSIsInVzZXJzLXJlYWQiXSwianRpIjoiMjYxYTZhYWQ2MTQ5Njk1ZmJiYzcwODM5MjM0Njc1NWQifQ."
    "dA5-HVzWv-BRfEiAd24uNBiBxASO-PAyWeWESovZm_hj4aXMAZA1-bWNZeXt88dqogo18AwpDQ-h6gefLPdZSFrG5umC1dVWaeYvUnGm62g4XS29fj6p01dhKNNqrsu5KrhnhdnKYVv9VdmbmqDfWR8wDgglk5cJFqalzq6dJWJInFQEPmUs9BW_Zs8tQDn-i5r4tYq2U8vCdqptXoM7YgPllXaPVDeccC9QNu2Xlp9WUvoROzoQXg25lFub1IYkTrM66gJ6t9fJRZToewCt495WNEOQFa_rwLCZ1QwzvL0iYkONHS_jZ0BOhBCdW9dWSawD6iF1SIQaFROvMDH1rg"
)

POSTS_URL = "https://restv2.fireant.vn/posts"

_HTML_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")

# Keep classification logic in sync with sources.rss
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


def _strip_html(s: str | None) -> str:
    if not s:
        return ""
    decoded = html.unescape(s)
    return _WS_RE.sub(" ", _HTML_RE.sub("", decoded)).strip()


def _classify(text: str) -> tuple[bool, bool]:
    lower = text.lower()
    breaking = any(k in lower for k in _BREAKING_KEYWORDS)
    important = breaking or any(k in lower for k in _IMPORTANT_KEYWORDS)
    return breaking, important


def _item_id(post_id: int) -> str:
    return hashlib.sha1(f"FireAnt|{post_id}".encode("utf-8")).hexdigest()[:16]


def _to_iso(raw: str | None) -> str | None:
    if not raw:
        return None
    try:
        # FireAnt date is ISO with offset, e.g. "2026-05-28T22:43:00+07:00"
        dt = datetime.fromisoformat(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        try:
            return parsedate_to_datetime(raw).astimezone(timezone.utc).isoformat()
        except Exception:
            return None


def _token() -> str:
    return (os.getenv("FIREANT_TOKEN") or "").strip() or PUBLIC_TOKEN


async def get_posts(limit: int = 30) -> list[dict]:
    """Fetch the latest FireAnt type=1 (news) posts, normalized to NewsItem shape."""
    headers = {
        "Authorization": f"Bearer {_token()}",
        "Accept": "application/json",
        "Origin": "https://fireant.vn",
    }
    try:
        r = await client().get(
            POSTS_URL,
            params={"type": 1, "offset": 0, "limit": max(1, min(50, limit))},
            headers=headers,
            timeout=15.0,
        )
        r.raise_for_status()
        raw = r.json()
    except Exception:
        return []

    items: list[dict] = []
    for p in raw or []:
        title = _strip_html(p.get("title"))
        if not title:
            continue
        summary = _strip_html(p.get("description") or p.get("summary"))
        link = (
            p.get("postSourceUrl")
            or p.get("link")
            or p.get("contentURL")
            or (p.get("postSource") or {}).get("url")
            or "https://fireant.vn/"
        )
        published = _to_iso(p.get("date"))
        breaking, important = _classify(title + " " + summary)
        items.append({
            "id": _item_id(p["postID"]),
            "source": "FireAnt",
            "title": title,
            "summary": summary,
            "link": link,
            "published": published,
            "breaking": breaking,
            "important": important,
        })
    return items
