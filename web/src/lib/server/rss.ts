import crypto from "crypto";
import { parseStringPromise } from "xml2js";

const LIVE_FEEDS: [string, string][] = [
  ["Cafef", "https://cafef.vn/thi-truong-chung-khoan.rss"],
  ["Cafef", "https://cafef.vn/tai-chinh-ngan-hang.rss"],
  ["Vietstock", "https://vietstock.vn/830/chung-khoan/co-phieu.rss"],
  ["Vietnambiz", "https://vietnambiz.vn/rss/chung-khoan.rss"],
];

const HEADLINE_FEEDS: [string, string][] = [
  ["VnExpress", "https://vnexpress.net/rss/kinh-doanh.rss"],
  ["VnExpress", "https://vnexpress.net/rss/chung-khoan.rss"],
];

const LIVE_FEEDS_EN: [string, string][] = [
  ["AJ", "https://www.aljazeera.com/xml/rss/all.xml"],
  ["CNN", "http://rss.cnn.com/rss/edition.rss"],
  ["CNN", "http://rss.cnn.com/rss/cnn_world.rss"],
  ["WSJ", "https://feeds.a.dj.com/rss/RSSWorldNews.xml"],
  ["WSJ", "https://feeds.a.dj.com/rss/RSSMarketsMain.xml"],
];

const HEADLINE_FEEDS_EN: [string, string][] = [
  ["MKT", "https://feeds.marketwatch.com/marketwatch/topstories/"],
  ["MKT", "https://feeds.marketwatch.com/marketwatch/realtimeheadlines/"],
  ["INV", "https://www.investing.com/rss/news.rss"],
];

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

function classify(text: string): { breaking: boolean; important: boolean } {
  const lower = text.toLowerCase();
  const breaking = BREAKING_KEYWORDS.some((k) => lower.includes(k));
  const important = breaking || IMPORTANT_KEYWORDS.some((k) => lower.includes(k));
  return { breaking, important };
}

function stripHtml(s: string | undefined | null): string {
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

function toIso(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {}
  return null;
}

function itemId(source: string, link: string, title: string): string {
  return crypto
    .createHash("sha1")
    .update(`${source}|${link}|${title}`)
    .digest("hex")
    .slice(0, 16);
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function fetchOne(source: string, url: string): Promise<NewsItem[]> {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml, */*" },
      next: { revalidate: 60 },
    });
    if (!r.ok) return [];
    const xml = await r.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false });
    const channel = parsed?.rss?.channel || parsed?.feed;
    if (!channel) return [];
    const entries: unknown[] = channel.item
      ? Array.isArray(channel.item) ? channel.item : [channel.item]
      : channel.entry
      ? Array.isArray(channel.entry) ? channel.entry : [channel.entry]
      : [];

    return entries.flatMap((e: unknown) => {
      const entry = e as Record<string, unknown>;
      const title = stripHtml(
        typeof entry.title === "object" ? (entry.title as Record<string, unknown>)?._ as string : entry.title as string
      );
      if (!title) return [];
      const linkObj = entry.link as Record<string, unknown> | null | undefined;
      const link =
        (typeof entry.link === "object" && entry.link !== null
          ? ((linkObj?.$ as Record<string, unknown>)?.href ?? linkObj?._)
          : entry.link) as string || "";
      const summary = stripHtml(
        (entry.description || entry.summary || entry["content:encoded"]) as string
      );
      const published = toIso((entry.pubDate || entry.published || entry.updated) as string);
      const { breaking, important } = classify(title + " " + summary);
      return [{
        id: itemId(source, link, title),
        source,
        title,
        summary,
        link,
        published,
        breaking,
        important,
      }];
    });
  } catch {
    return [];
  }
}

export type NewsItem = {
  id: string;
  source: string;
  title: string;
  summary: string;
  link: string;
  published: string | null;
  breaking: boolean;
  important: boolean;
  title_vi?: string;
  summary_vi?: string;
};

function mergeSorted(buckets: NewsItem[][], limit: number): NewsItem[] {
  const seen = new Set<string>();
  const merged: NewsItem[] = [];
  for (const bucket of buckets) {
    for (const item of bucket) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
  }
  merged.sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""));
  return merged.slice(0, limit);
}

export async function getLiveFeed(limit = 40): Promise<NewsItem[]> {
  const buckets = await Promise.all(LIVE_FEEDS.map(([s, u]) => fetchOne(s, u)));
  return mergeSorted(buckets, limit);
}

export async function getHeadlines(limit = 50): Promise<NewsItem[]> {
  const buckets = await Promise.all(HEADLINE_FEEDS.map(([s, u]) => fetchOne(s, u)));
  return mergeSorted(buckets, limit);
}

export async function getLiveFeedEn(limit = 30): Promise<NewsItem[]> {
  const buckets = await Promise.all(LIVE_FEEDS_EN.map(([s, u]) => fetchOne(s, u)));
  return mergeSorted(buckets, limit);
}

export async function getHeadlinesEn(limit = 40): Promise<NewsItem[]> {
  const buckets = await Promise.all(HEADLINE_FEEDS_EN.map(([s, u]) => fetchOne(s, u)));
  return mergeSorted(buckets, limit);
}
