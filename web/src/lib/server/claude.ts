import Anthropic from "@anthropic-ai/sdk";
import type { NewsItem } from "./rss";
import type { Quote } from "./cafef";

const MODEL = "claude-opus-4-7";
// Alternative cheaper models (uncomment to switch):
// const MODEL = "claude-sonnet-4-6"; // ~½ price
// const MODEL = "claude-haiku-4-5";  // ~⅕ price, fastest

const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích thị trường tài chính. \
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
- risks: 2-4 rủi ro chính, mỗi rủi ro 1 câu.`;

const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    vn: {
      type: "object",
      properties: {
        sentiment: { type: "string", enum: ["bullish", "bearish", "neutral"] },
        confidence: { type: "integer" },
        analysis: { type: "string" },
      },
      required: ["sentiment", "confidence", "analysis"],
      additionalProperties: false,
    },
    global: {
      type: "object",
      properties: {
        sentiment: { type: "string", enum: ["bullish", "bearish", "neutral"] },
        confidence: { type: "integer" },
        analysis: { type: "string" },
      },
      required: ["sentiment", "confidence", "analysis"],
      additionalProperties: false,
    },
    catalysts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          direction: { type: "string", enum: ["+", "-", "~"] },
          label: { type: "string" },
          detail: { type: "string" },
          region: { type: "string", enum: ["vn", "global"] },
        },
        required: ["direction", "label", "detail", "region"],
        additionalProperties: false,
      },
    },
    watchlist_notes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          sentiment: { type: "string", enum: ["bullish", "bearish", "neutral"] },
          note: { type: "string" },
        },
        required: ["symbol", "sentiment", "note"],
        additionalProperties: false,
      },
    },
    risks: { type: "array", items: { type: "string" } },
  },
  required: ["vn", "global", "catalysts", "watchlist_notes", "risks"],
  additionalProperties: false,
};

function formatQuotes(quotes: Quote[]): string {
  return (
    quotes
      .filter((q) => q.price != null)
      .map((q) => {
        const pct =
          typeof q.changePct === "number"
            ? `${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%`
            : "n/a";
        return `${q.symbol}: ${q.price} (${pct})`;
      })
      .join("\n") || "(không có dữ liệu)"
  );
}

function formatNews(items: NewsItem[], limit: number): string {
  return (
    items
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
      .join("\n") || "(không có tin)"
  );
}

function buildPrompt(
  vnindex: Quote | null,
  watchlist: Quote[],
  vnNews: NewsItem[],
  enNews: NewsItem[],
): string {
  const vnLine =
    vnindex?.price != null
      ? `VN-Index: ${vnindex.price} (${vnindex.change != null ? `${vnindex.change >= 0 ? "+" : ""}${vnindex.change}, ` : ""}${vnindex.changePct != null ? `${vnindex.changePct >= 0 ? "+" : ""}${vnindex.changePct.toFixed(2)}%` : ""})`
      : "n/a";

  return `## BỐI CẢNH GIÁ\n\n${vnLine}\n\n## WATCHLIST\n\n${formatQuotes(watchlist)}\n\n## TIN TỨC VIỆT NAM (24 tin gần nhất)\n\n${formatNews(vnNews, 24)}\n\n## TIN TỨC QUỐC TẾ ĐÃ DỊCH (15 tin gần nhất)\n\n${formatNews(enNews, 15)}\n\n---\n\nPhân tích thị trường VN và quốc tế dựa trên dữ liệu trên.`;
}

function emptyBrief(reason: string) {
  const empty = { sentiment: "neutral" as const, confidence: 0, analysis: reason };
  return {
    vn: { ...empty },
    global: { ...empty },
    catalysts: [],
    watchlist_notes: [],
    risks: [],
    generated_at: Math.floor(Date.now() / 1000),
    model: null as string | null,
  };
}

let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (_client) return _client;
  const key = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!key) return null;
  _client = new Anthropic({ apiKey: key });
  return _client;
}

export async function generateMarketBrief(
  vnindex: Quote | null,
  watchlist: Quote[],
  vnNews: NewsItem[],
  enNews: NewsItem[],
) {
  const client = getClient();
  if (!client)
    return emptyBrief(
      "Chưa cấu hình ANTHROPIC_API_KEY — lấy key tại https://console.anthropic.com/settings/keys.",
    );

  const userPrompt = buildPrompt(vnindex, watchlist, vnNews, enNews);

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
      thinking: { type: "adaptive" },
      output_config: {
        format: { type: "json_schema", schema: BRIEF_SCHEMA },
      },
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError)
      return emptyBrief("ANTHROPIC_API_KEY không hợp lệ — kiểm tra key trên console.anthropic.com.");
    if (e instanceof Anthropic.RateLimitError) {
      const retry = e.headers?.["retry-after"] ?? "?";
      return emptyBrief(`Claude API rate limit — thử lại sau ${retry}s.`);
    }
    if (e instanceof Anthropic.APIStatusError)
      return emptyBrief(`Lỗi gọi Claude API: HTTP ${e.status}`);
    if (e instanceof Anthropic.APIError)
      return emptyBrief(`Lỗi kết nối Claude API: ${String(e).slice(0, 160)}`);
    return emptyBrief(`Lỗi không xác định: ${String(e).slice(0, 160)}`);
  }

  if (response.stop_reason === "refusal") {
    const cat = response.stop_details?.category ?? "?";
    return emptyBrief(`Claude từ chối yêu cầu (category=${cat}).`);
  }

  if (response.stop_reason === "max_tokens")
    return emptyBrief("Claude bị cắt giữa chừng do max_tokens — thử lại.");

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock) return emptyBrief("Claude không trả về văn bản.");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    return emptyBrief("Claude trả về JSON không hợp lệ.");
  }

  function normSection(d: Record<string, unknown> | undefined) {
    return {
      sentiment: (d?.sentiment ?? "neutral") as string,
      confidence: Number(d?.confidence ?? 0),
      analysis: (d?.analysis ?? "") as string,
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

  return result;
}
