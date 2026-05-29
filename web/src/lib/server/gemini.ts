import type { NewsItem } from "./rss";
import type { Quote } from "./tcbs";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích thị trường tài chính. \
Dựa CHỈ trên các tin tức và dữ liệu giá được cung cấp, đưa ra đánh giá NGẮN GỌN \
về cả thị trường chứng khoán Việt Nam VÀ thị trường quốc tế (Mỹ, Châu Âu, Châu Á).

Quy tắc bắt buộc:
- Trả lời 100% bằng tiếng Việt.
- KHÔNG bịa thông tin không có trong dữ liệu đầu vào.
- KHÔNG đưa ra giá mục tiêu, KHÔNG khuyến nghị mua/bán cụ thể.
- Mỗi catalyst/risk phải tham chiếu được tới một tin tức trong input.
- Nếu input không đủ dữ liệu cho một khu vực, trả \`sentiment: "neutral"\` và confidence thấp cho khu vực đó.

Output PHẢI là JSON hợp lệ theo đúng schema:
{
  "vn": {
    "sentiment": "bullish" | "bearish" | "neutral",
    "confidence": <số nguyên 0-100>,
    "analysis": "<3-5 câu tiếng Việt>"
  },
  "global": {
    "sentiment": "bullish" | "bearish" | "neutral",
    "confidence": <số nguyên 0-100>,
    "analysis": "<3-5 câu tiếng Việt>"
  },
  "catalysts": [
    {"direction": "+" | "-" | "~", "label": "<3-6 từ>", "detail": "<1 câu>", "region": "vn"|"global"}
  ],
  "watchlist_notes": [
    {"symbol": "<TICKER>", "sentiment": "bullish|bearish|neutral", "note": "<1 câu>"}
  ],
  "risks": ["<1 câu rủi ro chính>"]
}`;

function formatQuotes(quotes: Quote[]): string {
  return quotes
    .filter((q) => q.price != null)
    .map((q) => {
      const pct = typeof q.changePct === "number" ? `${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%` : "n/a";
      return `${q.symbol}: ${q.price} (${pct})`;
    })
    .join("\n") || "(không có dữ liệu)";
}

function formatNews(items: NewsItem[], limit: number): string {
  return items
    .slice(0, limit)
    .map((it) => {
      const title = it.title_vi || it.title;
      const summary = it.summary_vi || it.summary;
      const when = (it.published ?? "").slice(0, 16);
      const flag = it.breaking ? " [NÓNG]" : it.important ? " [QUAN TRỌNG]" : "";
      let line = `- [${it.source} ${when}${flag}] ${title}`;
      if (summary) line += ` — ${summary.slice(0, 240)}`;
      return line;
    })
    .join("\n") || "(không có tin)";
}

function buildPrompt(vnindex: Quote | null, watchlist: Quote[], vnNews: NewsItem[], enNews: NewsItem[]): string {
  const vnLine = vnindex?.price != null
    ? `VN-Index: ${vnindex.price} (${vnindex.change != null ? `${vnindex.change >= 0 ? "+" : ""}${vnindex.change}, ` : ""}${vnindex.changePct != null ? `${vnindex.changePct >= 0 ? "+" : ""}${vnindex.changePct.toFixed(2)}%` : ""})`
    : "n/a";

  return `## BỐI CẢNH GIÁ\n\n${vnLine}\n\n## WATCHLIST\n\n${formatQuotes(watchlist)}\n\n## TIN TỨC VIỆT NAM (24 tin gần nhất)\n\n${formatNews(vnNews, 24)}\n\n## TIN TỨC QUỐC TẾ ĐÃ DỊCH (15 tin gần nhất)\n\n${formatNews(enNews, 15)}\n\n---\n\nPhân tích thị trường VN dựa trên dữ liệu trên. Trả lời JSON theo schema đã cho.`;
}

function emptyBrief(reason: string) {
  const empty = { sentiment: "neutral" as const, confidence: 0, analysis: reason };
  return { vn: { ...empty }, global: { ...empty }, catalysts: [], watchlist_notes: [], risks: [], generated_at: Math.floor(Date.now() / 1000), model: null };
}

function extractJson(text: string): Record<string, unknown> | null {
  let s = text.trim();
  if (s.startsWith("```")) {
    const parts = s.split("```");
    s = parts[1] ?? s;
    if (s.startsWith("json")) s = s.slice(4).trimStart();
  }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(s.slice(start, end + 1)); } catch { return null; }
}

export async function generateMarketBrief(
  vnindex: Quote | null,
  watchlist: Quote[],
  vnNews: NewsItem[],
  enNews: NewsItem[]
) {
  const key = (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "").trim();
  if (!key) return emptyBrief("Chưa cấu hình GEMINI_API_KEY.");

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: buildPrompt(vnindex, watchlist, vnNews, enNews) }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.4, maxOutputTokens: 4000, thinkingConfig: { thinkingBudget: 0 } },
  };

  let lastErr = "";
  let payload: Record<string, unknown> | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`${ENDPOINT}?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if ([429, 500, 502, 503, 504].includes(r.status)) {
        lastErr = `HTTP ${r.status}`;
        await new Promise((res) => setTimeout(res, 2 ** attempt * 1000));
        continue;
      }
      if (!r.ok) { lastErr = `HTTP ${r.status}`; break; }
      payload = await r.json();
      break;
    } catch (e) {
      lastErr = String(e).slice(0, 200);
      await new Promise((res) => setTimeout(res, 2 ** attempt * 1000));
    }
  }

  if (!payload) return emptyBrief(`Lỗi gọi Gemini API: ${lastErr}`);

  const candidates = (payload.candidates as Record<string, unknown>[]) ?? [];
  if (!candidates.length) return emptyBrief(`Gemini không trả candidates.`);

  const parts = ((candidates[0].content as Record<string, unknown>)?.parts as Record<string, unknown>[]) ?? [];
  const text = parts.map((p) => p.text ?? "").join("");

  const parsed = extractJson(text as string);
  if (!parsed) return emptyBrief(`Model không trả về JSON hợp lệ.`);

  function normSection(d: Record<string, unknown> | undefined) {
    return {
      sentiment: (d?.sentiment ?? "neutral") as string,
      confidence: Number(d?.confidence ?? 0),
      analysis: (d?.analysis ?? d?.summary ?? "") as string,
    };
  }

  const result = {
    vn: normSection(parsed.vn as Record<string, unknown>),
    global: normSection(parsed.global as Record<string, unknown>),
    catalysts: (parsed.catalysts as unknown[]) ?? [],
    watchlist_notes: (parsed.watchlist_notes as unknown[]) ?? [],
    risks: (parsed.risks as unknown[]) ?? [],
    generated_at: Math.floor(Date.now() / 1000),
    model: MODEL,
  };

  for (const c of result.catalysts as Record<string, unknown>[]) {
    if (!c.region) c.region = "vn";
  }

  return result;
}
