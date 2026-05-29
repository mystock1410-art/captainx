"""Market brief generator — Claude Opus 4.7 reads news + quotes and outputs
a structured Vietnamese assessment of VN and global equity markets.

Uses the official Anthropic Python SDK with structured outputs (json_schema)
and adaptive thinking for higher-quality reasoning."""
from __future__ import annotations
import json
import os
import time

import anthropic

MODEL = "claude-opus-4-7"
# Alternative models if cost-sensitive (uncomment to switch):
# MODEL = "claude-sonnet-4-6"  # ~½ price, still very capable
# MODEL = "claude-haiku-4-5"   # ~⅕ price, fastest

SYSTEM_PROMPT = """Bạn là chuyên gia phân tích thị trường tài chính. \
Dựa CHỈ trên các tin tức và dữ liệu giá được cung cấp, đưa ra đánh giá NGẮN GỌN \
về cả thị trường chứng khoán Việt Nam VÀ thị trường quốc tế (Mỹ, Châu Âu, Châu Á).

Quy tắc bắt buộc:
- Trả lời 100% bằng tiếng Việt.
- KHÔNG bịa thông tin không có trong dữ liệu đầu vào.
- KHÔNG đưa ra giá mục tiêu, KHÔNG khuyến nghị mua/bán cụ thể.
- Mỗi catalyst/risk phải tham chiếu được tới một tin tức trong input.
- Nếu input không đủ dữ liệu cho một khu vực, trả sentiment "neutral" và confidence thấp cho khu vực đó.

Yêu cầu nội dung:
- vn.analysis và global.analysis: mỗi mục ĐÚNG 3-5 câu (không quá dài, không 1-2 câu).
- vn.confidence và global.confidence: số nguyên 0-100.
- catalysts: 3-5 mục tổng (cả vn và global), đánh dấu region cho từng mục.
- catalyst direction: "+" tích cực, "-" tiêu cực, "~" trung tính.
- watchlist_notes: chỉ thêm mã ĐƯỢC NHẮC TRỰC TIẾP trong tin (có thể 0 mã).
- risks: 2-4 rủi ro chính, mỗi rủi ro 1 câu.
"""

BRIEF_SCHEMA = {
    "type": "object",
    "properties": {
        "vn": {
            "type": "object",
            "properties": {
                "sentiment": {"type": "string", "enum": ["bullish", "bearish", "neutral"]},
                "confidence": {"type": "integer"},
                "analysis": {"type": "string"},
            },
            "required": ["sentiment", "confidence", "analysis"],
            "additionalProperties": False,
        },
        "global": {
            "type": "object",
            "properties": {
                "sentiment": {"type": "string", "enum": ["bullish", "bearish", "neutral"]},
                "confidence": {"type": "integer"},
                "analysis": {"type": "string"},
            },
            "required": ["sentiment", "confidence", "analysis"],
            "additionalProperties": False,
        },
        "catalysts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "direction": {"type": "string", "enum": ["+", "-", "~"]},
                    "label": {"type": "string"},
                    "detail": {"type": "string"},
                    "region": {"type": "string", "enum": ["vn", "global"]},
                },
                "required": ["direction", "label", "detail", "region"],
                "additionalProperties": False,
            },
        },
        "watchlist_notes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string"},
                    "sentiment": {"type": "string", "enum": ["bullish", "bearish", "neutral"]},
                    "note": {"type": "string"},
                },
                "required": ["symbol", "sentiment", "note"],
                "additionalProperties": False,
            },
        },
        "risks": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["vn", "global", "catalysts", "watchlist_notes", "risks"],
    "additionalProperties": False,
}


_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic | None:
    global _client
    if _client is not None:
        return _client
    key = (os.getenv("ANTHROPIC_API_KEY") or "").strip()
    if not key:
        return None
    _client = anthropic.AsyncAnthropic(api_key=key)
    return _client


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

Phân tích thị trường VN và quốc tế dựa trên dữ liệu trên."""


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


async def generate_market_brief(
    vnindex: dict | None,
    watchlist_quotes: list[dict],
    vn_news: list[dict],
    en_news: list[dict],
) -> dict:
    client = _get_client()
    if client is None:
        return _empty_brief(
            "Chưa cấu hình ANTHROPIC_API_KEY — thêm vào api/.env "
            "(lấy key tại https://console.anthropic.com/settings/keys)."
        )

    user_prompt = _build_prompt(vnindex, watchlist_quotes, vn_news, en_news)

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=[{
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }],
            messages=[{"role": "user", "content": user_prompt}],
            thinking={"type": "adaptive"},
            output_config={
                "format": {"type": "json_schema", "schema": BRIEF_SCHEMA},
            },
        )
    except anthropic.AuthenticationError:
        return _empty_brief(
            "ANTHROPIC_API_KEY không hợp lệ — kiểm tra key trên console.anthropic.com."
        )
    except anthropic.RateLimitError as e:
        retry = "?"
        try:
            retry = e.response.headers.get("retry-after", "?")
        except Exception:
            pass
        return _empty_brief(f"Claude API rate limit — thử lại sau {retry}s.")
    except anthropic.APIStatusError as e:
        return _empty_brief(f"Lỗi gọi Claude API: HTTP {e.status_code}")
    except anthropic.APIError as e:
        return _empty_brief(f"Lỗi kết nối Claude API: {str(e)[:160]}")

    if response.stop_reason == "refusal":
        cat = "?"
        if response.stop_details:
            cat = getattr(response.stop_details, "category", "?") or "?"
        return _empty_brief(f"Claude từ chối yêu cầu (category={cat}).")

    if response.stop_reason == "max_tokens":
        return _empty_brief("Claude bị cắt giữa chừng do max_tokens — thử lại.")

    text = next((b.text for b in response.content if b.type == "text"), None)
    if not text:
        return _empty_brief("Claude không trả về văn bản.")

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return _empty_brief("Claude trả về JSON không hợp lệ.")

    for section in ("vn", "global"):
        if section in parsed and "confidence" in parsed[section]:
            try:
                parsed[section]["confidence"] = int(parsed[section]["confidence"])
            except (TypeError, ValueError):
                parsed[section]["confidence"] = 0

    parsed["generated_at"] = int(time.time())
    parsed["model"] = MODEL
    return parsed
