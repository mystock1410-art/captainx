import crypto from "crypto";
import type { NewsItem } from "./rss";

const PUBLIC_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IkdYdExONzViZlZQakdvNERWdjV4QkRITHpnSSIsImtpZCI6IkdYdExONzViZlZQakdvNERWdjV4QkRITHpnSSJ9." +
  "eyJpc3MiOiJodHRwczovL2FjY291bnRzLmZpcmVhbnQudm4iLCJhdWQiOiJodHRwczovL2FjY291bnRzLmZpcmVhbnQudm4vcmVzb3VyY2VzIiwiZXhwIjoxODg5NjIyNTMwLCJuYmYiOjE1ODk2MjI1MzAsImNsaWVudF9pZCI6ImZpcmVhbnQudHJhZGVzdGF0aW9uIiwic2NvcGUiOlsiYWNhZGVteS1yZWFkIiwiYWNhZGVteS13cml0ZSIsImFjY291bnRzLXJlYWQiLCJhY2NvdW50cy13cml0ZSIsImJsb2ctcmVhZCIsImNvbXBhbmllcy1yZWFkIiwiZmluYW5jZS1yZWFkIiwiaW5kaXZpZHVhbHMtcmVhZCIsImludmVzdG9wZWRpYS1yZWFkIiwib3JkZXJzLXJlYWQiLCJvcmRlcnMtd3JpdGUiLCJwb3N0cy1yZWFkIiwicG9zdHMtd3JpdGUiLCJzZWFyY2giLCJzeW1ib2xzLXJlYWQiLCJ1c2VyLWRhdGEtcmVhZCIsInVzZXItZGF0YS13cml0ZSIsInVzZXJzLXJlYWQiXSwianRpIjoiMjYxYTZhYWQ2MTQ5Njk1ZmJiYzcwODM5MjM0Njc1NWQifQ." +
  "dA5-HVzWv-BRfEiAd24uNBiBxASO-PAyWeWESovZm_hj4aXMAZA1-bWNZeXt88dqogo18AwpDQ-h6gefLPdZSFrG5umC1dVWaeYvUnGm62g4XS29fj6p01dhKNNqrsu5KrhnhdnKYVv9VdmbmqDfWR8wDgglk5cJFqalzq6dJWJInFQEPmUs9BW_Zs8tQDn-i5r4tYq2U8vCdqptXoM7YgPllXaPVDeccC9QNu2Xlp9WUvoROzoQXg25lFub1IYkTrM66gJ6t9fJRZToewCt495WNEOQFa_rwLCZ1QwzvL0iYkONHS_jZ0BOhBCdW9dWSawD6iF1SIQaFROvMDH1rg";

const BREAKING_KEYWORDS = [
  "khẩn", "nóng", "vừa", "breaking", "cấp tốc",
  "công bố", "tăng trần", "giảm sàn", "hủy niêm yết",
];
const IMPORTANT_KEYWORDS = [
  "fed", "nhnn", "lãi suất", "tỷ giá", "lạm phát",
  "gdp", "cpi", "ngân hàng nhà nước", "thủ tướng",
  "trái phiếu", "thuế", "fomc", "ecb", "boj",
  "vn-index", "vn30", "hose", "ssc", "uỷ ban chứng khoán",
  "phát hành", "cổ tức", "chia tách", "esop",
  "đáo hạn", "phái sinh", "khối ngoại",
];

function classify(text: string) {
  const lower = text.toLowerCase();
  const breaking = BREAKING_KEYWORDS.some((k) => lower.includes(k));
  const important = breaking || IMPORTANT_KEYWORDS.some((k) => lower.includes(k));
  return { breaking, important };
}

function stripHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function toIso(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {}
  return null;
}

function itemId(postId: number): string {
  return crypto.createHash("sha1").update(`FireAnt|${postId}`).digest("hex").slice(0, 16);
}

function token(): string {
  return (process.env.FIREANT_TOKEN ?? "").trim() || PUBLIC_TOKEN;
}

export async function getPosts(limit = 30): Promise<NewsItem[]> {
  try {
    const params = new URLSearchParams({ type: "1", offset: "0", limit: String(Math.min(50, Math.max(1, limit))) });
    const r = await fetch(`https://restv2.fireant.vn/posts?${params}`, {
      headers: {
        Authorization: `Bearer ${token()}`,
        Accept: "application/json",
        Origin: "https://fireant.vn",
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 90 },
    });
    if (!r.ok) return [];
    const raw: Record<string, unknown>[] = await r.json();
    const items: NewsItem[] = [];
    for (const p of raw ?? []) {
      const title = stripHtml(p.title as string);
      if (!title) continue;
      const summary = stripHtml((p.description ?? p.summary) as string);
      const link =
        (p.postSourceUrl as string) ||
        (p.link as string) ||
        (p.contentURL as string) ||
        ((p.postSource as Record<string, string>)?.url) ||
        "https://fireant.vn/";
      const published = toIso(p.date as string);
      const { breaking, important } = classify(title + " " + summary);
      items.push({
        id: itemId(p.postID as number),
        source: "FireAnt",
        title,
        summary,
        link,
        published,
        breaking,
        important,
      });
    }
    return items;
  } catch {
    return [];
  }
}
