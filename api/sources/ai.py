"""Market brief generator — Google Gemini Flash reads news + quotes and outputs
a structured Vietnamese assessment of the VN equity market.

Uses the Gemini REST API via httpx (no SDK install needed)."""
from __future__ import annotations
import json
import os
import time

from .http import client

MODEL = "gemini-2.5-flash"
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

SYSTEM_PROMPT = """Bạn là chuyên gia phân tích thị trường tài chính. \
Dựa CHỈ trên các tin tức và dữ liệu giá được cung cấp, đưa ra đánh giá NGẮN GỌN \
về cả thị trường chứng khoán Việt Nam VÀ thị trường quốc tế (Mỹ, Châu Âu, Châu Á).

Quy tắc bắt buộc:
- Trả lời 100% bằng tiếng Việt.
- KHÔNG bịa thông tin không có trong dữ liệu đầu vào.
- KHÔNG đưa ra giá mục tiêu, KHÔNG khuyến nghị mua/bán cụ thể.
- Mỗi catalyst/risk phải tham chiếu được tới một tin tức trong input.
- Nếu input không đủ dữ liệu cho một khu vực, trả `sentiment: "neutral"` và confidence thấp cho khu vực đó.

Output PHẢI là JSON hợp lệ theo đúng schema:
{
  "vn": {
    "sentiment": "bullish" | "bearish" | "neutral",
    "confidence": <số nguyên 0-100>,
    "analysis": "<3-5 câu tiếng Việt: tâm lý + narrative chính + bối cảnh giá VN-Index/watchlist>"
  },
  "global": {
    "sentiment": "bullish" | "bearish" | "neutral",
    "confidence": <số nguyên 0-100>,
    "analysis": "<3-5 câu tiếng Việt: tâm lý + diễn biến chính của TTCK Mỹ/Châu Âu/Châu Á (DJI, S&P, FED, ECB, BOJ, Nikkei, Hang Seng, dầu, USD, v.v.)>"
  },
  "catalysts": [
    {"direction": "+" | "-" | "~", "label": "<3-6 từ>", "detail": "<1 câu giải thích>", "region": "vn"|"global"}
  ],
  "watchlist_notes": [
    {"symbol": "<TICKER>", "sentiment": "bullish|bearish|neutral", "note": "<1 câu>"}
  ],
  "risks": ["<1 câu rủi ro chính>", "..."]
}

Yêu cầu length:
- vn.analysis và global.analysis: mỗi mục ĐÚNG 3-5 câu (không quá dài, không 1-2 câu).
- 3-5 catalysts tổng (gồm cả vn và global, đánh dấu `region` cho từng mục)
- watchlist_notes: chỉ thêm mã ĐƯỢC NHẮC TRỰC TIẾP trong tin (có thể 0 mã)
- 2-4 risks
"""


def _api_key() -> str | None:
    key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    return key or None


def _format_quotes(quotes: list[dict]) -> str:
    rows: list[str] = []
    for q in quotes:
        if q.get("price") is None:
            continue
        pct = q.get("changePct")
        pct_s = f"{pct:+.2f}%" if isinstance(pct, (int, float)) else "n/a"
        rows.append(f"{q['symbol']}: {q['price']} ({pct_s})")
    return "\n".join(rows) or "(không có dữ liệu)"


def _format_news(items: list[dict], limit: int) -> str:
    lines: list[str] = []
    for it in items[:limit]:
        title = it.get("title_vi") or it.get("title") or ""
        summary = it.get("summary_vi") or it.get("summary") or ""
        src = it.get("source", "?")
        when = (it.get("published") or "")[:16]
        flag = " [NÓNG]" if it.get("breaking") else (" [QUAN TRỌNG]" if it.get("important") else "")
        body = f"- [{src} {when}{flag}] {title}"
        if summary:
            body += f" — {summary[:240]}"
        lines.append(body)
    return "\n".join(lines) or "(không có tin)"


def _build_prompt(
    vnindex: dict | None,
    watchlist_quotes: list[dict],
    vn_news: list[dict],
    en_news: list[dict],
) -> str:
    vn_index_line = "n/a"
    if vnindex and vnindex.get("price") is not None:
        chg = vnindex.get("change")
        pct = vnindex.get("changePct")
        vn_index_line = (
            f"VN-Index: {vnindex['price']} "
            f"({chg:+.2f}, {pct:+.2f}%)"
            if isinstance(chg, (int, float)) and isinstance(pct, (int, float))
            else f"VN-Index: {vnindex['price']}"
        )

    return f"""## BỐI CẢNH GIÁ

{vn_index_line}

## WATCHLIST

{_format_quotes(watchlist_quotes)}

## TIN TỨC VIỆT NAM (24 tin gần nhất)

{_format_news(vn_news, 24)}

## TIN TỨC QUỐC TẾ ĐÃ DỊCH (15 tin gần nhất)

{_format_news(en_news, 15)}

---

Phân tích thị trường VN dựa trên dữ liệu trên. Trả lời JSON theo schema đã cho."""


def _empty_brief(reason: str) -> dict:
    empty_section = {"sentiment": "neutral", "confidence": 0, "analysis": reason}
    return {
        "vn": dict(empty_section),
        "global": dict(empty_section),
        "catalysts": [],
        "watchlist_notes": [],
        "risks": [],
        "generated_at": int(time.time()),
        "model": None,
    }


def _extract_json(text: str) -> dict | None:
    s = text.strip()
    if s.startswith("```"):
        s = s.split("```", 2)[1] if s.count("```") >= 2 else s
        if s.startswith("json"):
            s = s[4:].lstrip()
    start = s.find("{")
    end = s.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(s[start : end + 1])
    except Exception:
        return None


async def generate_market_brief(
    vnindex: dict | None,
    watchlist_quotes: list[dict],
    vn_news: list[dict],
    en_news: list[dict],
) -> dict:
    key = _api_key()
    if key is None:
        return _empty_brief(
            "Chưa cấu hình GEMINI_API_KEY — thêm vào api/.env (xem .env.example)."
        )

    user_prompt = _build_prompt(vnindex, watchlist_quotes, vn_news, en_news)
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.4,
            "maxOutputTokens": 4000,
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }

    import asyncio
    last_err: str = ""
    payload = None
    for attempt in range(3):
        try:
            r = await client().post(
                ENDPOINT.format(model=MODEL),
                params={"key": key},
                json=body,
                timeout=60.0,
            )
            if r.status_code in (429, 500, 502, 503, 504):
                last_err = f"HTTP {r.status_code}"
                await asyncio.sleep(2 ** attempt)
                continue
            r.raise_for_status()
            payload = r.json()
            break
        except Exception as e:
            msg = str(e).split("?key=")[0]  # scrub api key from URL
            last_err = msg[:200]
            await asyncio.sleep(2 ** attempt)

    if payload is None:
        return _empty_brief(f"Lỗi gọi Gemini API: {last_err}")

    candidates = payload.get("candidates") or []
    if not candidates:
        return _empty_brief(f"Gemini không trả candidates. Raw: {json.dumps(payload)[:300]}")

    parts = (candidates[0].get("content") or {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts if isinstance(p, dict))

    parsed = _extract_json(text)
    if parsed is None:
        snippet = text[:300].replace("\n", " ")
        finish = (candidates[0].get("finishReason") or "?")
        return _empty_brief(f"Model không trả về JSON hợp lệ (finish={finish}). Text: {snippet!r}")

    # Normalize: accept new schema {vn, global, ...} or legacy {sentiment, summary, ...}
    def _norm_section(d: dict | None) -> dict:
        d = d or {}
        return {
            "sentiment": d.get("sentiment", "neutral"),
            "confidence": int(d.get("confidence", 0) or 0),
            "analysis": d.get("analysis") or d.get("summary") or "",
        }

    if "vn" not in parsed and "sentiment" in parsed:
        # Legacy fallback: wrap into vn section
        parsed = {
            "vn": _norm_section(parsed),
            "global": _norm_section(None),
            "catalysts": parsed.get("catalysts", []),
            "watchlist_notes": parsed.get("watchlist_notes", []),
            "risks": parsed.get("risks", []),
        }
    else:
        parsed["vn"] = _norm_section(parsed.get("vn"))
        parsed["global"] = _norm_section(parsed.get("global"))
        parsed.setdefault("catalysts", [])
        parsed.setdefault("watchlist_notes", [])
        parsed.setdefault("risks", [])

    # Default region for catalysts that don't specify
    for c in parsed["catalysts"]:
        if "region" not in c:
            c["region"] = "vn"

    parsed["generated_at"] = int(time.time())
    parsed["model"] = MODEL
    return parsed
